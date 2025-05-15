import axios from 'https://cdn.skypack.dev/axios';

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

document.addEventListener('DOMContentLoaded', () => {
  const moviesSection = document.getElementById('movies-container');
  if (moviesSection) {
    loadLikedMovies();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const loginVisibility = document.getElementById('login-form')
  if (loginVisibility) {
    const token = localStorage.getItem('token');
    loginVisibility.style.display = token ? 'none' : 'block';

  }
});

document.addEventListener('DOMContentLoaded', () => {
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('search-button');
  if (searchButton) {
    searchButton.addEventListener('click', (e) => {
      e.preventDefault();
      searchMovies();
    });
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const logoutVisibility = document.getElementById('logout-box')
  if (logoutVisibility) {
    const token = localStorage.getItem('token');
    logoutVisibility.style.display = token ? 'block' : 'none';
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
  const query = document.getElementById("searchInput").value;
  const token = localStorage.getItem('token');

  if (!query.trim()){
    alert("Please enter a search term.")
    return;
  }

  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  fetch (`/api/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: headers
  })
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

      if (movie.liked) {
        movieEl.innerHTML = `
        <strong>${movie.original_title}</strong><br>
        <small>${movie.release_date}</small><br>
        ${movie.overview}<br>
        <button class="unlike-btn" id="unlike-button" data-movie-id='${movie.id}'>Unlike</button>
        <div id="like-msg-${movie.id}" class="like-message" style="color: red"></div>`;
      } else {
        movieEl.innerHTML = `
        <strong>${movie.original_title}</strong><br>
        <small>${movie.release_date}</small><br>
        ${movie.overview}<br>
        <button class="like-btn" id="like-button" data-movie-id='${movie.id}'>Like</button>
        <div id="like-msg-${movie.id}" class="like-message" style="color: red"></div>`;
      }

      resultsDiv.appendChild(movieEl);
    });

    document.querySelectorAll('.like-btn').forEach(button => {
      button.addEventListener('click', () => {
        const movieID = button.dataset.movieId;
        likeMovie(movieID);
      });
    });

    document.querySelectorAll('.unlike-btn').forEach(button => {
      button.addEventListener('click', () => {
        const movieID = button.dataset.movieId;
        unlikeMovie(movieID);
      });
    });
  })
  .catch(err => alert("Error: " + err.message));
}

async function unlikeMovie(id) {
  try {
    const res = await fetch ('/api/unlike', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id: id })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to unlike movie');
    }
  } catch (error) {
      alert(`Error: ${error.message}`);
  }
}


function likeMovie(id) {
  const token = localStorage.getItem('token');
  const messageDiv = document.getElementById(`like-msg-${id}`);
  if (!token) {
    if (messageDiv) {
      messageDiv.innerText = "Please log in or sign up to like a movie.";
      setTimeout(() => {
        messageDiv.innerText = "";
      }, 3000);
    } else {
      alert("Please log in or sign up to like a movie.");
    }
    return;
  }
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

async function logout() {
  try {
      const res = await fetch('/api/revoke', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('refresh_token')}`
          },
      });
      if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Failed to logout');
      }
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/app/index.html'
      
  } catch (error) {
      alert(`Error: ${error.message}`);
  }
}

//need to change html, add event listner
async function loadLikedMovies() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to view liked movies.');
    window.location.href = '/app/login.html';
    return;
  }

  try {
    const res = await fetch('/api/user/likes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!res.ok) {
      throw new Error('Failed to load liked movies');
    }

    const likedMovies = await res.json();
    const container = document.getElementById('movies-container');
    container.innerHTML = '';

    if (likedMovies.length === 0) {
      container.innerHTML = '<p>You have no liked movies yet.</p>';
      return;
    }

    likedMovies.forEach(movie => {
      const movieDiv = document.createElement('div');
      movieDiv.className = 'liked-movie';
      movieDiv.innerHTML = `
        <h3>${movie.Title}</h3>
        <p>${movie.Overview}</p>
        <small>Released: ${movie.ReleaseDate}</small>
        <button class="unlike-btn" data-movie-id="${movie.MovieID}">Unlike</button>`;
        container.appendChild(movieDiv);
    });
    document.querySelectorAll('.unlike-btn').forEach(button => {
      button.addEventListener('click', () => {
        const movieID = button.dataset.movieId;
        unlikeMovie(movieID);
      });
    });
  } catch (err) {
    console.error(err);
    document.getElementById('movies-container').innerText = 'Could not retrieve liked movies.';
  }
}

//update movie id table and struct, build new db, 
// make id in database unique, get rid of uuid. 
//then can send id easily. 
//check for liked
//send package back with liked = false, button change on home end
//no liked =
