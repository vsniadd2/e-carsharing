const users = [];

export function getUsers() {
  return users;
}

export function addUser(user) {
  users.push(user);
}

export function findUserById(id) {
  return users.find((u) => u.id === id);
}
