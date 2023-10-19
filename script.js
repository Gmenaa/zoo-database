const forms = document.querySelector(".forms")
const signupLink = document.querySelectorAll(".signup-link")
const loginLink = document.querySelectorAll(".login-link")
const empLoginLink = document.querySelectorAll(".emp-login-link")

signupLink.forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        forms.classList.remove("show-login", "show-empLogin");
        forms.classList.toggle("show-signup")
    })
})

loginLink.forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        forms.classList.remove("show-signup", "show-empLogin");
        forms.classList.toggle("show-login")
    })
})

empLoginLink.forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        forms.classList.remove("show-login", "show-signup");
        forms.classList.toggle("show-empLogin")
    })
})