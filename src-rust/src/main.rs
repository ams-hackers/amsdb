#![feature(proc_macro_hygiene, decl_macro)]

#[macro_use]
extern crate rocket;
extern crate rocket_contrib;
#[macro_use]
extern crate serde_derive;

use regex::Regex;
use rocket_contrib::json::Json;

#[derive(Serialize)]
struct BasicResponse {
    status: &'static str,
    message: String,
}

#[get("/keys/<key>?<_token>")]
fn get_key(key: String, _token: String) -> Json<BasicResponse> {
    let valid_key_regex = Regex::new(r"[a-zA-Z0-9_-]+").unwrap();

    let is_valid_key = valid_key_regex.is_match(&key);

    if !is_valid_key {
        return Json(BasicResponse {
            status: "error",
            message: "Key is invalid, must match [a-zA-Z0-9_-]+".to_string(),
        });
    }

    let message = format!(
        "Key is {}, validity is {}",
        &key,
        valid_key_regex.is_match(&key)
    );
    Json(BasicResponse {
        status: "success",
        message: message,
    })
}

// #[put("/keys/<key>")]
// fn set_key(key: &RawStr) -> &'static str {
//     "Hello, world!"
// }

fn main() {
    rocket::ignite().mount("/", routes![get_key]).launch();
}
