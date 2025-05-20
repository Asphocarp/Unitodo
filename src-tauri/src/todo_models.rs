#![allow(clippy::all)]
use serde::{Deserialize, Serialize};

// --- todo Data Structures for internal logic ---
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize)]
pub struct TodoItem {
    pub content: String,
    pub location: String,
    pub status: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub struct TodoCategoryData {
    pub name: String,
    pub icon: String,
    pub todos: Vec<TodoItem>,
}

impl Ord for TodoCategoryData {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.name.cmp(&other.name)
    }
}

impl PartialOrd for TodoCategoryData {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessedTodosOutput {
    pub categories: Vec<TodoCategoryData>,
}

#[derive(Debug, PartialEq, Eq, Hash, Clone, PartialOrd, Ord, Serialize, Deserialize)]
pub enum TodoCategoryEnum {
    Project(String),
    GitRepo(String),
    Other,
}

impl TodoCategoryEnum {
    pub fn get_details(&self) -> (String, String) {
        match self {
            TodoCategoryEnum::Project(name) => (name.clone(), "".to_string()), 
            TodoCategoryEnum::GitRepo(name) => (name.clone(), "󰊢".to_string()), 
            TodoCategoryEnum::Other => ("Other".to_string(), "".to_string()), 
        }
    }
} 