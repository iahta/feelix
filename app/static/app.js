document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-box');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      signup();
    });
  }

  const loginForm = document.getElementById('login-box');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      login();
    });
  }
});



document.addEventListener('DOMContentLoaded', async () => {
  const loginVisibility = document.getElementById('login-form')
  if (loginVisibility) {
    const token = localStorage.getItem('token');
    loginVisibility.style.display = token ? 'none' : 'block';

  }
});

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
      const res = await fetch('/api/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              email,
              password
          }),
      });
      const data = await res.json();
      if (!res.ok) {
          throw new Error(`Failed to login: ${data.error}`);
      }

      if (data.token) {
          localStorage.setItem('token', data.token);
          window.location.href = '/app/index.html'
      } else {
          alert('Login failed. Please check your credentials.');
      }
  } catch (error) {
      alert(`Error: ${error.message}`);
  }
}


async function signup() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirm_password = document.getElementById('confirm_password').value;

  try {
      const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              email,
              password,
              confirm_password
          }),
      });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(`Failed to create user: ${data.error}`);
      }
      console.log('User created!');
      await login();
  } catch (error) {
      alert(`Error: ${error.message}`);
  }
}