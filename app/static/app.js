let movieCache = [];

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
          localStorage.setItem('refresh_token', data.refresh_token);
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

function searchMovies() {
  const apiBase = "http://localhost:8080/api"
  const query = document.getElementById("searchInput").value;
  if (!query.trim()){
    alert("Please enter a search term.")
    return;
  }

  fetch (`${apiBase}/search?q=${encodeURIComponent(query)}`)
  .then(res => {
    if (!res.ok) throw new Error("API error");
    return res.json();
  })
  .then(data => {
    movieCache = data; //store movies globally
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    if (!data.length) {
      resultsDiv.innerHTML = "<p>No results found.</p>";
      return;
    }

    data.forEach(movie => {
      const movieEl = document.createElement("div");
      movieEl.className = "movie";
      movieEl.innerHTML = `
      <strong>${movie.original_title}</strong><br>
      <small>${movie.release_date}</small><br>
      ${movie.overview}<br>
      <button onclick='likeMovie(${movie.id})'>Like</button>`;
      resultsDiv.appendChild(movieEl);
    });
  })
  .catch(err => alert("Error: " + err));
}

function likeMovie(id) {
  const movie = movieCache.find(m => m.id === id);
  if (!movie) {
    alert("Movie not found in cache.");
    return;
  }

  fetch('/api/like', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(movie)
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(data => { throw new Error(data.error || "Unknown error"); });
      }
      alert("Movie Liked!");
    })
    .catch(err => alert("Error liking movie: " + err.message));
}

//refresh handler, javascript, when 401 calls
// Set up an interceptor to handle 401 responses
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If it's a 401 and we haven't tried refreshing yet
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Call the refresh endpoint
        const response = await axios.post('/api/refresh', {}, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('refresh_token')}`
          }
        });
        
        // Update the stored JWT
        const newToken = response.data.token;
        localStorage.setItem('token', newToken);
        
        // Retry the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        //need to add acutal login location
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);