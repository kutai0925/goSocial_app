use std::{collections::HashMap, sync::{Arc, Mutex}};

use axum::{Json, Router, extract::State, routing::post};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Default, Clone)]
struct AppState {
    users: Arc<Mutex<HashMap<Uuid, User>>>
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
async fn try_add_user(State(state): State<AppState>, Json(payload): Json<User>) {
    let user_id = Uuid::new_v4();

    let user = User {
        username: payload.username,
        password_hash: payload.password_hash,
        user_id
    };

    state.users.lock().unwrap().insert(user_id, user.clone());
}