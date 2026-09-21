import { logout } from "./auth.js";

export function setupNavbar(user) {
  const nav = document.getElementById("navbar");
  nav.innerHTML = "";

  const links = document.createElement("div");
  links.className = "nav-links";
  [
    ["Found items", "listing.html"],
    ["I found something", "upload.html"],
    ["My profile", "profile.html"]
  ].forEach(([text, href]) => {
    const a = document.createElement("a");
    a.textContent = text;
    a.href = href;
    links.appendChild(a);
  });

  const right = document.createElement("div");
  right.className = "nav-user";

  const avatar = document.createElement("img");
  avatar.src = user.photoURL || "";
  avatar.alt = "";
  avatar.referrerPolicy = "no-referrer";

  const name = document.createElement("span");
  name.textContent = user.displayName || user.email;

  const btn = document.createElement("button");
  btn.textContent = "Sign out";
  btn.addEventListener("click", async () => {
    await logout();
    window.location.href = "index.html";
  });

  right.append(avatar, name, btn);
  nav.append(links, right);
}