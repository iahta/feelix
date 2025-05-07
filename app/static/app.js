document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('signup-box').addEventListener('submit', function(e) {
      e.preventDefault();
      signup();
  });
});

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password');

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
          document.getElementById('auth-section').style.display = 'none';
          document.getElementById('video-section').style.display = 'block';
          await getVideos();
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