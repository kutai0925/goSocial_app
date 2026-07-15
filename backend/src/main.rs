use std::{collections::{HashMap, HashSet}, sync::{Arc, Mutex}};

use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Default, Clone)]
struct AppState {
    users: Arc<Mutex<HashMap<Uuid, User>>>,
    names: Arc<Mutex<HashSet<String>>>
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
        .with_state(shared_state);

    // creating the listener and binding it to the expo address
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8081").await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

// handler for the user creation TODO: add Uuid return and check if user exists
async fn try_add_user(State(state): State<AppState>, Json(payload): Json<User>) 
-> Result<Json<Uuid>, StatusCode> {
    // checks if the username already exists, if it does returns StatusCode 400
    if !state.names.lock().unwrap().contains(&payload.username) {
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
    state.names.lock().unwrap().insert(user.username.clone());
    // adds the user to the hashmap
    state.users.lock().unwrap().insert(user_id, user.clone());

    Ok(Json(user.user_id))
}