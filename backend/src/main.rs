use std::{collections::HashMap, sync::{Arc, Mutex}};

use axum::{Json, Router, extract::{Path, State}, http::StatusCode, routing::{delete, post, put, get}};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use tower_http::trace::TraceLayer;

// shared App state used by the handlers to get information requried
#[derive(Default, Clone)]
struct AppState {
    users: Arc<Mutex<HashMap<Uuid, User>>>,
    names: Arc<Mutex<HashMap<String, Uuid>>>
}

#[derive(Serialize, Deserialize, Clone)]
struct User {
    username: String,
    #[serde(skip_serializing)]
    password_hash: String,
    #[serde(default)]
    user_id: Uuid,
    #[serde(default)]
    coordinates: Coordinates,
    #[serde(default, skip_serializing)]
    messages: Vec<Message>
}

#[derive(Serialize, Deserialize, Default, Clone)]
struct Coordinates {
    lat: f64,
    lon: f64,
    accuracy: i8
}

#[derive(Serialize, Deserialize, Default, Clone)]
struct Message {
    message: String,
    to_user_id: Uuid,
    #[serde(default)]
    timestamp: DateTime<Utc>,
    #[serde(default)]
    received: bool
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    
    let shared_state = AppState::default(); 

    // create the router and set the handler for paths
    let app = Router::new()
        .route("/v1/users", post(try_add_user))
        .route("/v1/users/login", put(try_login))
        .route("/v1/users/{user_id}", delete(del_user))
        .route("/v1/users/{user_id}/coordinates", put(try_set_location))
        .route("/v1/users/{user_id}", get(try_get_user))
        .route("/v1/users/nearby", get(try_get_all_users))
        .route("/v1/messages/{user_id}", post(try_post_message))
        .route("/v1/messages/list/{user_id}", get(try_get_messages))
        .with_state(shared_state)
        .layer(TraceLayer::new_for_http());

    // creating the listener and binding it to all network interfaces (0.0.0.0) so it works on LAN
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8888").await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

//***********************************************************************************************************
// Start of Account Handling
//***********************************************************************************************************

/// handler for the user creation 
/// uses the Json payload to create a user
/// if the username in the payload already exists, returns StatusCode 400 (BadRequest)
/// else creates the user and returns the Uuid in Json
#[axum::debug_handler]
async fn try_add_user(State(state): State<AppState>, Json(payload): Json<User>) 
-> Result<Json<Uuid>, StatusCode> {
    // checks if the username already exists, if it does returns StatusCode 400
    if state.names.lock().unwrap().contains_key(&payload.username) {
        return Err(StatusCode::BAD_REQUEST)
    }

    // generates a new Unique user id
    let user_id = Uuid::new_v4();

    // creates the user
    let user = User::from(payload.username, payload.password_hash, user_id);

    // inserts the username so we know it exists
    state.names.lock().unwrap().insert(user.username.clone(), user_id);
    // adds the user to the hashmap
    state.users.lock().unwrap().insert(user_id, user.clone());

    Ok(Json(user.user_id))
}

/// handler for the login
/// uses the payload to check if the login is valid
/// returns the Uuid in json if valid
#[axum::debug_handler]
async fn try_login(State(state): State<AppState>, Json(payload): Json<User>) 
-> Result<Json<Uuid>, StatusCode> {
    // checks if the username exists, if it does not returns StatusCode 400
    if !state.names.lock().unwrap().contains_key(&payload.username) {
        return Err(StatusCode::BAD_REQUEST)
    }

    // gets the Uuid from the username, returns StatusCode 500 if fail
    let &user_id = match state.names.lock().unwrap().get(&payload.username) {
        Some(x) => x,
        None => return Err(StatusCode::INTERNAL_SERVER_ERROR)
    };

    // matches the password in the payload with the saved password, 
    // if same just continues, else responds with StatusCode 400
    match &state.users.lock().unwrap().get(&user_id).unwrap().password_hash {
        s if *s == payload.password_hash => {},
        _ => return Err(StatusCode::BAD_REQUEST)
    }

    // if it gets till here its a valid login, thus returns the user_id
    Ok(Json(user_id))
}

/// handler to delete a user
/// path is used to get the userid
#[axum::debug_handler]
async fn del_user(State(state): State<AppState>, Path(path): Path<String>) -> StatusCode {
    // parses the path into a Uuid to use, returns SatusCode 500 on fail
    let user_id = match Uuid::parse_str(&path) {
        Ok(id) => id,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
    };

    let username = state.users.lock().unwrap().get(&user_id).unwrap().username.clone();
    // removes the name from the already used names, returns StatusCode 500 on fail
    match state.names.lock().unwrap().remove(&username) {
        Some(_) => {},
        None => return StatusCode::INTERNAL_SERVER_ERROR
    }

    // removes the user from the users, returns StatusCode 400 on fail
    match state.users.lock().unwrap().remove(&user_id) {
        Some(_) => {},
        None => return StatusCode::BAD_REQUEST
    }

    StatusCode::OK
}
//***********************************************************************************************************
// End of Account Handling
//***********************************************************************************************************

//***********************************************************************************************************
// Start of User data requests Handling
//***********************************************************************************************************

/// handler for getting a specific user based on user_id
/// path contains the user_id
/// returns the user as json if successful
#[axum::debug_handler]
async fn try_get_user(State(state): State<AppState>, Path(path): Path<String>) 
-> Result<Json<User>, StatusCode> {
    // parses the path into a Uuid to use, returns SatusCode 500 on fail
    let user_id = match Uuid::parse_str(&path) {
        Ok(id) => id,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    // returns the user as json if exists, else returns StatusCode 400 on fail
    match state.users.lock().unwrap().get(&user_id) {
        Some(u) => return Ok(Json(u.clone())),
        None => return Err(StatusCode::BAD_REQUEST)
    }
}

// handler which returns all the users in a json
#[axum::debug_handler]
async fn try_get_all_users(State(state): State<AppState>) -> Json<Vec<User>> {
    Json(state.users.lock().unwrap().values().cloned().collect())
}

//***********************************************************************************************************
// End of User data requests Handling
//***********************************************************************************************************

//***********************************************************************************************************
// Start of Location Handling
//***********************************************************************************************************

// handler to set the location of the current user
// path is used for the id of the user to update the location of
// payload contains the location
#[axum::debug_handler]
async fn try_set_location(State(state): State<AppState>, 
Path(path): Path<String>, 
Json(payload): Json<Coordinates>) 
-> StatusCode {

    // parses the path into a Uuid to use, returns SatusCode 500 on fail
    let user_id = match Uuid::parse_str(&path) {
        Ok(id) => id,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
    };

    // gets the user assositate with the user_id sent in the path, and sets the new Coordiantes 
    // returns StatusCode 400 if it fails
    match state.users.lock().unwrap().get_mut(&user_id) {
        Some(x) => x.coordinates = Coordinates { 
            lat: payload.lat, 
            lon: payload.lon, 
            accuracy: payload.accuracy },
        None => return StatusCode::BAD_REQUEST
    };

    // returns 200
    StatusCode::OK
}

//***********************************************************************************************************
// End of Location Handling
//***********************************************************************************************************

//***********************************************************************************************************
// Start of Message Handling
//***********************************************************************************************************

/// handler to add a messege to the list of messages TODO: auth
#[axum::debug_handler]
async fn try_post_message(State(state): State<AppState>, 
Path(path): Path<String>, 
Json(payload): Json<Message>) 
-> StatusCode {
    // parses the path into a Uuid to use, returns SatusCode 500 on fail
    let user_id = match Uuid::parse_str(&path) {
        Ok(id) => id,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
    };

    // checks if the target user exists, if it does not returns StatusCode 400
    if !state.users.lock().unwrap().contains_key(&payload.to_user_id) {
        return StatusCode::BAD_REQUEST
    }

    // gets the user assositate with the user_id sent in the path, and adds the message 
    // returns StatusCode 400 if it fails
    match state.users.lock().unwrap().get_mut(&user_id) {
        Some(x) => x.messages.push(Message { 
            message: payload.message.clone(), 
            to_user_id: payload.to_user_id, 
            timestamp: chrono::offset::Utc::now(),
            received: false }),
        None => return StatusCode::BAD_REQUEST
    };

    // gets the user assositate with the to_user_id sent in the payload, and adds the message 
    // returns StatusCode 400 if it fails
    match state.users.lock().unwrap().get_mut(&payload.to_user_id) {
        Some(x) => x.messages.push(Message { 
            message: payload.message, 
            to_user_id: user_id, 
            timestamp: chrono::offset::Utc::now(),
            received: true }),
        None => return StatusCode::BAD_REQUEST
    };

    StatusCode::OK
}

/// handler to get all the messages of a certain user TODO: auth
#[axum::debug_handler]
async fn try_get_messages(State(state): State<AppState>, Path(path): Path<String>) 
-> Result<Json<Vec<Message>>, StatusCode> {
    // parses the path into a Uuid to use, returns SatusCode 500 on fail
    let user_id = match Uuid::parse_str(&path) {
        Ok(id) => id,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    // get the user and respond with messegas if successful, or StatusCode 400 if not
    match state.users.lock().unwrap().get(&user_id) {
        Some(u) => return Ok(Json(u.messages.iter().cloned().collect())),
        None => return Err(StatusCode::BAD_REQUEST)
    }
}

//***********************************************************************************************************
// End of Message Handling
//***********************************************************************************************************

impl User {
    fn from(username: String, password_hash: String, user_id: Uuid) -> Self {
        Self {
            username,
            password_hash,
            user_id,
            coordinates: Coordinates::default(),
            messages: Vec::new()
        }
    }
}
