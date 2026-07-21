use axum::{
    extract::{DefaultBodyLimit, Path, State, WebSocketUpgrade, ws::{Message as WsMessage, WebSocket}},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool, Row};
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::trace::TraceLayer;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
    tx: broadcast::Sender<String>, // global broadcast channel for ws
}

#[derive(Serialize, Deserialize, Clone)]
struct User {
    user_id: Uuid,
    username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    password_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    first_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    bio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    profile_image: Option<String>, 
    #[serde(skip_serializing_if = "Option::is_none")]
    coordinates: Option<Coordinates>,
    #[serde(skip_serializing_if = "Option::is_none")]
    relationship: Option<String>,
}

#[derive(Deserialize)]
struct ProfileUpdatePayload {
    first_name: Option<String>,
    last_name: Option<String>,
    bio: Option<String>,
    location: Option<String>,
    profile_image: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct Coordinates {
    lat: f64,
    lon: f64,
    accuracy: i64,
}

#[derive(Serialize, Deserialize, Clone)]
struct ChatMessage {
    id: i64,
    message: String,
    to_user_id: Uuid,
    from_user_id: Uuid,
    timestamp: DateTime<Utc>,
    #[serde(default)]
    received: bool,
}

#[derive(Deserialize)]
struct PostMessagePayload {
    message: String,
    to_user_id: Uuid,
}

#[derive(Serialize, Deserialize, Clone)]
struct WsPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    event: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Event {
    id: String,
    title: String,
    category: String,
    #[serde(rename = "locationName")]
    location_name: String,
    time: String,
    lat: f64,
    lon: f64,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Create sqlite DB if it doesn't exist
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect("sqlite:gosocial.db?mode=rwc")
        .await
        .expect("Failed to create pool");

    init_db(&pool).await;

    let (tx, _rx) = broadcast::channel(100);

    let shared_state = AppState { db: pool, tx };

    let app = Router::new()
        .route("/v1/users", post(add_user))
        .route("/v1/users/login", put(login_user))
        .route("/v1/users/{user_id}", delete(del_user))
        .route("/v1/users/{user_id}/coordinates", put(set_location))
        .route("/v1/users/{user_id}/profile", put(update_profile))
        .route("/v1/users/{user_id}", get(get_user))
        .route("/v1/users/nearby", get(get_nearby_users))
        .route("/v1/messages/{user_id}", post(post_message))
        .route("/v1/messages/list/{user_id}", get(get_messages))
        .route("/v1/ws/chat/{user_id}", get(ws_handler))
        .route("/v1/events", post(add_event))
        .route("/v1/events/nearby", get(get_nearby_events))
        .route("/v1/waves/{from_user}/{to_user}", post(send_wave))
        .route("/v1/waves/{from_user}/{to_user}/accept", put(accept_wave))
        .route("/v1/waves/{from_user}/{to_user}/decline", put(decline_wave))
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024))
        .with_state(shared_state)
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8888").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn init_db(pool: &SqlitePool) {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            bio TEXT,
            location TEXT,
            profile_image TEXT,
            lat REAL,
            lon REAL,
            accuracy INTEGER
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            to_user_id TEXT NOT NULL,
            from_user_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            location_name TEXT NOT NULL,
            time TEXT NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS waves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user_id TEXT NOT NULL,
            to_user_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(from_user_id, to_user_id)
        );
        "#
    )
    .execute(pool)
    .await
    .unwrap();

    // Insert Echo Bot
    let bot_id = Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap();
    let _ = sqlx::query("INSERT INTO users (user_id, username, password_hash, first_name, last_name, bio) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(bot_id.to_string())
        .bind("EchoBot")
        .bind("bot")
        .bind("Echo")
        .bind("Bot")
        .bind("I reply to everything!")
        .execute(pool).await;
}

// ----------------- USERS -----------------

#[derive(Deserialize)]
struct AuthPayload {
    username: String,
    password_hash: Option<String>,
}

#[axum::debug_handler]
async fn add_user(State(state): State<AppState>, Json(payload): Json<AuthPayload>) -> Result<Json<Uuid>, StatusCode> {
    let user_id = Uuid::new_v4();
    let res = sqlx::query("INSERT INTO users (user_id, username, password_hash) VALUES (?, ?, ?)")
        .bind(user_id.to_string())
        .bind(&payload.username)
        .bind(payload.password_hash.unwrap_or_default())
        .execute(&state.db)
        .await;

    match res {
        Ok(_) => Ok(Json(user_id)),
        Err(_) => Err(StatusCode::BAD_REQUEST),
    }
}

#[axum::debug_handler]
async fn login_user(State(state): State<AppState>, Json(payload): Json<AuthPayload>) -> Result<Json<Uuid>, StatusCode> {
    let user = sqlx::query("SELECT user_id FROM users WHERE username = ? AND password_hash = ?")
        .bind(&payload.username)
        .bind(payload.password_hash.unwrap_or_default())
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match user {
        Some(row) => {
            let id: String = row.get("user_id");
            Ok(Json(Uuid::parse_str(&id).unwrap()))
        }
        None => Err(StatusCode::BAD_REQUEST),
    }
}

#[axum::debug_handler]
async fn del_user(State(state): State<AppState>, Path(user_id): Path<Uuid>) -> StatusCode {
    let res = sqlx::query("DELETE FROM users WHERE user_id = ?")
        .bind(user_id.to_string())
        .execute(&state.db)
        .await;
    if res.is_ok() { StatusCode::OK } else { StatusCode::BAD_REQUEST }
}

#[axum::debug_handler]
async fn set_location(State(state): State<AppState>, Path(user_id): Path<Uuid>, Json(coords): Json<Coordinates>) -> StatusCode {
    let res = sqlx::query("UPDATE users SET lat = ?, lon = ?, accuracy = ? WHERE user_id = ?")
        .bind(coords.lat)
        .bind(coords.lon)
        .bind(coords.accuracy)
        .bind(user_id.to_string())
        .execute(&state.db)
        .await;
        
    if res.is_ok() { 
        if let Ok(json) = serde_json::to_string(&WsPayload { message: None, event: Some("LOCATION_UPDATE".to_string()), data: None }) {
            let _ = state.tx.send(json);
        }
        StatusCode::OK 
    } else { 
        StatusCode::BAD_REQUEST 
    }
}

#[axum::debug_handler]
async fn update_profile(State(state): State<AppState>, Path(user_id): Path<Uuid>, Json(payload): Json<ProfileUpdatePayload>) -> StatusCode {
    let res = sqlx::query(
        "UPDATE users SET first_name = ?, last_name = ?, bio = ?, location = ?, profile_image = ? WHERE user_id = ?"
    )
    .bind(payload.first_name)
    .bind(payload.last_name)
    .bind(payload.bio)
    .bind(payload.location)
    .bind(payload.profile_image)
    .bind(user_id.to_string())
    .execute(&state.db)
    .await;
    if res.is_ok() { StatusCode::OK } else { StatusCode::BAD_REQUEST }
}

#[axum::debug_handler]
async fn get_user(
    State(state): State<AppState>, 
    Path(user_id): Path<Uuid>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<User>, StatusCode> {
    let viewer_id = params.get("viewer_id");

    let row = sqlx::query("SELECT * FROM users WHERE user_id = ?")
        .bind(user_id.to_string())
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(r) = row {
        let mut u = row_to_user(r);
        let mut is_friend = false;
        
        if let Some(v_id) = viewer_id {
            if v_id != &user_id.to_string() {
                let w1 = sqlx::query("SELECT status FROM waves WHERE from_user_id = ? AND to_user_id = ?")
                    .bind(v_id)
                    .bind(user_id.to_string())
                    .fetch_optional(&state.db).await.unwrap_or(None);
                let w2 = sqlx::query("SELECT status FROM waves WHERE from_user_id = ? AND to_user_id = ?")
                    .bind(user_id.to_string())
                    .bind(v_id)
                    .fetch_optional(&state.db).await.unwrap_or(None);

                let s1: Option<String> = w1.map(|row| row.get("status"));
                let s2: Option<String> = w2.map(|row| row.get("status"));

                if s1.as_deref() == Some("accepted") || s2.as_deref() == Some("accepted") {
                    is_friend = true;
                }
            } else {
                is_friend = true;
            }
        }

        if !is_friend && user_id.to_string() != "00000000-0000-0000-0000-000000000000" {
            u.profile_image = None;
            u.last_name = None;
            u.bio = Some("Wave at them to discover more!".to_string());
            u.location = Some("Nearby".to_string());
        }

        Ok(Json(u))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

#[axum::debug_handler]
async fn get_nearby_users(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<User>>, StatusCode> {
    let current_user_id = params.get("user_id").cloned();

    let rows = sqlx::query("SELECT * FROM users")
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut users = Vec::new();
    for r in rows {
        let mut u = row_to_user(r);
        u.relationship = Some("none".to_string());

        if let Some(ref cu_id) = current_user_id {
            if u.user_id.to_string() == *cu_id {
                continue; // skip self
            }

            let w1 = sqlx::query("SELECT status FROM waves WHERE from_user_id = ? AND to_user_id = ?")
                .bind(cu_id)
                .bind(u.user_id.to_string())
                .fetch_optional(&state.db)
                .await.unwrap_or(None);

            let w2 = sqlx::query("SELECT status FROM waves WHERE from_user_id = ? AND to_user_id = ?")
                .bind(u.user_id.to_string())
                .bind(cu_id)
                .fetch_optional(&state.db)
                .await.unwrap_or(None);

            let s1: Option<String> = w1.map(|row| row.get("status"));
            let s2: Option<String> = w2.map(|row| row.get("status"));

            if s1.as_deref() == Some("accepted") || s2.as_deref() == Some("accepted") {
                u.relationship = Some("accepted".to_string());
            } else if s1.as_deref() == Some("pending") {
                u.relationship = Some("sent".to_string());
            } else if s2.as_deref() == Some("pending") {
                u.relationship = Some("received".to_string());
            }
        }

        if u.relationship.as_deref() != Some("accepted") && u.user_id.to_string() != "00000000-0000-0000-0000-000000000000" {
            // User requested to display profile picture when available, so we no longer mask it
        }

        users.push(u);
    }
    Ok(Json(users))
}

fn row_to_user(row: sqlx::sqlite::SqliteRow) -> User {
    let id_str: String = row.get("user_id");
    let lat: Option<f64> = row.get("lat");
    let lon: Option<f64> = row.get("lon");
    let accuracy: Option<i64> = row.get("accuracy");

    let coords = if let (Some(la), Some(lo)) = (lat, lon) {
        Some(Coordinates { lat: la, lon: lo, accuracy: accuracy.unwrap_or(0) })
    } else {
        None
    };

    User {
        user_id: Uuid::parse_str(&id_str).unwrap(),
        username: row.get("username"),
        password_hash: None,
        first_name: row.get("first_name"),
        last_name: row.get("last_name"),
        bio: row.get("bio"),
        location: row.get("location"),
        profile_image: row.get("profile_image"),
        coordinates: coords,
        relationship: None,
    }
}

// ----------------- WAVES -----------------

#[axum::debug_handler]
async fn send_wave(State(state): State<AppState>, Path((from_user, to_user)): Path<(Uuid, Uuid)>) -> StatusCode {
    // Check if there is already a pending wave from the other user
    let existing = sqlx::query("SELECT status FROM waves WHERE from_user_id = ? AND to_user_id = ?")
        .bind(to_user.to_string())
        .bind(from_user.to_string())
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    if let Some(row) = existing {
        let status: String = row.get("status");
        if status == "pending" {
            // Reciprocal wave -> automatically accept
            let _ = sqlx::query("UPDATE waves SET status = 'accepted' WHERE from_user_id = ? AND to_user_id = ?")
                .bind(to_user.to_string())
                .bind(from_user.to_string())
                .execute(&state.db)
                .await;

            let _ = sqlx::query("INSERT INTO waves (from_user_id, to_user_id, status) VALUES (?, ?, 'accepted') ON CONFLICT(from_user_id, to_user_id) DO UPDATE SET status = 'accepted'")
                .bind(from_user.to_string())
                .bind(to_user.to_string())
                .execute(&state.db)
                .await;

            if let Ok(json) = serde_json::to_string(&WsPayload { message: None, event: Some("WAVE_UPDATE".to_string()), data: None }) {
                let _ = state.tx.send(json);
            }
            return StatusCode::OK;
        }
    }

    let res = sqlx::query("INSERT INTO waves (from_user_id, to_user_id, status) VALUES (?, ?, 'pending') ON CONFLICT(from_user_id, to_user_id) DO UPDATE SET status = 'pending'")
        .bind(from_user.to_string())
        .bind(to_user.to_string())
        .execute(&state.db)
        .await;

    if res.is_ok() { 
        if let Ok(json) = serde_json::to_string(&WsPayload { message: None, event: Some("WAVE_UPDATE".to_string()), data: None }) {
            let _ = state.tx.send(json);
        }
        StatusCode::OK 
    } else { 
        StatusCode::BAD_REQUEST 
    }
}

#[axum::debug_handler]
async fn accept_wave(State(state): State<AppState>, Path((from_user, to_user)): Path<(Uuid, Uuid)>) -> StatusCode {
    let res = sqlx::query("UPDATE waves SET status = 'accepted' WHERE from_user_id = ? AND to_user_id = ?")
        .bind(from_user.to_string())
        .bind(to_user.to_string())
        .execute(&state.db)
        .await;

    // Create mutual relationship
    let _ = sqlx::query("INSERT INTO waves (from_user_id, to_user_id, status) VALUES (?, ?, 'accepted') ON CONFLICT(from_user_id, to_user_id) DO UPDATE SET status = 'accepted'")
        .bind(to_user.to_string())
        .bind(from_user.to_string())
        .execute(&state.db)
        .await;

    if res.is_ok() { 
        if let Ok(json) = serde_json::to_string(&WsPayload { message: None, event: Some("WAVE_UPDATE".to_string()), data: None }) {
            let _ = state.tx.send(json);
        }
        StatusCode::OK 
    } else { 
        StatusCode::BAD_REQUEST 
    }
}

#[axum::debug_handler]
async fn decline_wave(State(state): State<AppState>, Path((from_user, to_user)): Path<(Uuid, Uuid)>) -> StatusCode {
    let res = sqlx::query("UPDATE waves SET status = 'rejected' WHERE from_user_id = ? AND to_user_id = ?")
        .bind(from_user.to_string())
        .bind(to_user.to_string())
        .execute(&state.db)
        .await;

    if res.is_ok() { StatusCode::OK } else { StatusCode::BAD_REQUEST }
}

// ----------------- MESSAGES -----------------

#[axum::debug_handler]
async fn post_message(
    State(state): State<AppState>,
    Path(from_user_id): Path<Uuid>,
    Json(payload): Json<PostMessagePayload>,
) -> StatusCode {
    let ts = Utc::now();
    let res = sqlx::query("INSERT INTO messages (message, to_user_id, from_user_id, timestamp) VALUES (?, ?, ?, ?)")
        .bind(&payload.message)
        .bind(payload.to_user_id.to_string())
        .bind(from_user_id.to_string())
        .bind(ts)
        .execute(&state.db)
        .await;

    if res.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }

    let msg = ChatMessage {
        id: 0,
        message: payload.message.clone(),
        to_user_id: payload.to_user_id,
        from_user_id,
        timestamp: ts,
        received: true,
    };

    // Broadcast to websockets
    if let Ok(json) = serde_json::to_string(&WsPayload { message: Some(msg.clone()), event: None, data: None }) {
        let _ = state.tx.send(json);
    }

    // Echo Bot auto-reply
    let bot_id = Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap();
    if payload.to_user_id == bot_id {
        let reply_ts = Utc::now();
        let reply_msg = format!("Echo: {}", payload.message);
        let _ = sqlx::query("INSERT INTO messages (message, to_user_id, from_user_id, timestamp) VALUES (?, ?, ?, ?)")
            .bind(&reply_msg)
            .bind(from_user_id.to_string())
            .bind(bot_id.to_string())
            .bind(reply_ts)
            .execute(&state.db)
            .await;

        let bmsg = ChatMessage {
            id: 0,
            message: reply_msg,
            to_user_id: from_user_id,
            from_user_id: bot_id,
            timestamp: reply_ts,
            received: true,
        };
        if let Ok(json) = serde_json::to_string(&WsPayload { message: Some(bmsg), event: None, data: None }) {
            let _ = state.tx.send(json);
        }
    }

    StatusCode::OK
}

#[axum::debug_handler]
async fn get_messages(State(state): State<AppState>, Path(user_id): Path<Uuid>) -> Result<Json<Vec<ChatMessage>>, StatusCode> {
    let rows = sqlx::query("SELECT * FROM messages WHERE to_user_id = ? OR from_user_id = ? ORDER BY timestamp ASC")
        .bind(user_id.to_string())
        .bind(user_id.to_string())
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut msgs = Vec::new();
    for r in rows {
        let id: i64 = r.get("id");
        let msg: String = r.get("message");
        let to_id_str: String = r.get("to_user_id");
        let from_id_str: String = r.get("from_user_id");
        let ts: DateTime<Utc> = r.get("timestamp");

        let to_u = Uuid::parse_str(&to_id_str).unwrap();
        let from_u = Uuid::parse_str(&from_id_str).unwrap();

        let (other_id, received) = if to_u == user_id {
            (from_u, true)
        } else {
            (to_u, false)
        };

        msgs.push(ChatMessage {
            id,
            message: msg,
            to_user_id: other_id, 
            from_user_id: from_u,
            timestamp: ts,
            received,
        });
    }
    Ok(Json(msgs))
}

// ----------------- WEBSOCKET -----------------

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>, Path(user_id): Path<Uuid>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state, user_id))
}

async fn handle_socket(socket: WebSocket, state: AppState, user_id: Uuid) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if let Ok(payload) = serde_json::from_str::<WsPayload>(&msg) {
                if let Some(m) = payload.message {
                    if m.to_user_id == user_id || m.from_user_id == user_id {
                        let _ = sender.send(WsMessage::Text(msg.clone().into())).await;
                    }
                } else {
                    // non-message events
                    let _ = sender.send(WsMessage::Text(msg.clone().into())).await;
                }
            }
        }
    });

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            // Ignore incoming messages, rely on POST /v1/messages
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}

// ----------------- EVENTS -----------------

#[axum::debug_handler]
async fn add_event(State(state): State<AppState>, Json(payload): Json<Event>) -> StatusCode {
    let res = sqlx::query("INSERT INTO events (id, title, category, location_name, time, lat, lon) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(payload.id)
        .bind(payload.title)
        .bind(payload.category)
        .bind(payload.location_name)
        .bind(payload.time)
        .bind(payload.lat)
        .bind(payload.lon)
        .execute(&state.db)
        .await;

    if res.is_ok() { StatusCode::OK } else { StatusCode::BAD_REQUEST }
}

#[axum::debug_handler]
async fn get_nearby_events(State(state): State<AppState>) -> Result<Json<Vec<Event>>, StatusCode> {
    let rows = sqlx::query("SELECT * FROM events")
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut events = Vec::new();
    for r in rows {
        events.push(Event {
            id: r.get("id"),
            title: r.get("title"),
            category: r.get("category"),
            location_name: r.get("location_name"),
            time: r.get("time"),
            lat: r.get("lat"),
            lon: r.get("lon"),
        });
    }
    Ok(Json(events))
}
