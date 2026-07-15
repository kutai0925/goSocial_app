use std::{collections::HashMap, sync::{Arc, Mutex}};

use axum::{Json, Router, extract::State, http::StatusCode, routing::{post, put}};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Default, Clone)]
struct AppState {
    users: Arc<Mutex<HashMap<Uuid, User>>>,
    names: Arc<Mutex<HashMap<String, Uuid>>>
}

#[derive(Deserialize, Clone)]
struct User {
    username: String,
    password_hash: String,
    user_id: Uuid
}

#[tokio::main]
async fn main() {
    let shared_state = AppState::default(); 

    // create the router and set the handler for paths
    let app = Router::new()
        .route("/v1/users", post(try_add_user))
        .route("/v1/users/login", put(try_login))
        .with_state(shared_state);

    // creating the listener and binding it to the expo address
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8081").await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

/// handler for the user creation 
/// uses the Json payload to create a user
/// if the username in the payload already exists, returns StatusCode 400 (BadRequest)
/// else creates the user and returns the Uuid in Json
async fn try_add_user(State(state): State<AppState>, Json(payload): Json<User>) 
-> Result<Json<Uuid>, StatusCode> {
    // checks if the username already exists, if it does returns StatusCode 400
    if state.names.lock().unwrap().contains_key(&payload.username) {
        return Err(StatusCode::BAD_REQUEST)
    }

    // generates a new Unique user id
    let user_id = Uuid::new_v4();

    // creates the user
    let user = User {
        username: payload.username,
        password_hash: payload.password_hash,
        user_id
    };

    // inserts the username so we know it exists
    state.names.lock().unwrap().insert(user.username.clone(), user_id);
    // adds the user to the hashmap
    state.users.lock().unwrap().insert(user_id, user.clone());

    Ok(Json(user.user_id))
}

/// handler for the login
/// uses the payload to check if the login is valid
/// returns the Uuid in json if valid
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