import axios from 'https://cdn.skypack.dev/axios';

let movieCache = [];

document.addEventListener('DOMContentLoaded', () => {
  const email = sessionStorage.getItem('signupEmail') || '';
  const password = sessionStorage.getItem('signupPassword') || '';

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  if (emailInput && passwordInput) {
    emailInput.value = email;
    passwordInput.value = password;
  }

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
  const loginVisibility = document.getElementById('login-form');
  let actionType = 'login';
  if (loginVisibility) {
    document.getElementById('login-btn').addEventListener('click', () => {
      actionType = 'login';
    });
    document.getElementById('signup-btn').addEventListener('click', () => {
      actionType = 'signup';
    });

    loginVisibility.addEventListener('submit', function(e) {
      e.preventDefault();
      if (actionType === 'signup') {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        sessionStorage.setItem('signupEmail', email);
        sessionStorage.setItem('signupPassword', password);
        window.location.href = '/app/signup.html'
      } else {
        login();
      }
    });
    const token = localStorage.getItem('token');
    loginVisibility.style.display = token ? 'none' : 'block';
  };
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

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('bg');
  if (canvas) {
    function resizeCanvasToFullScreen(canvas) {
      canvas.widht = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resizeCanvasToFullScreen(canvas);
    window.addEventListener('resize', () => resizeCanvasToFullScreen(canvas));
  }
})


async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const messageDiv = document.getElementById("login-msg")

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
          throw new Error(`${data.error}`);
      }

      if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('refresh_token', data.refresh_token);
          window.location.href = '/app/index.html'
      } else {
          if (messageDiv) {
            messageDiv.innerText = "Login failed! Please check your credentials.";
            setTimeout(() => messageDiv.innerText = "", 2000);
          }
      }
  } catch (error) {
      if (messageDiv) {
        messageDiv.innerText = `Login failed! ${error.message}`;
        setTimeout(() => messageDiv.innerText = "", 2000);
      }   
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
      sessionStorage.removeItem('signupEmail');
      sessionStorage.removeItem('signupPassword');
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

    data.forEach(renderMovie);

    bindLikeButtons();

    applyMoodTheme(query);
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
      body: JSON.stringify({ id: parseInt(id, 10) })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to unlike movie');
    }
    const btn = document.querySelector(`button[data-movie-id="${id}"]`);
    const messageDiv = document.getElementById(`like-msg-${id}`);
      if (btn) {
        btn.innerText = "Like";
        btn.classList.remove("unlike-btn");
        btn.classList.add("like-btn");
        btn.replaceWith(btn.cloneNode(true));
        bindLikeButtons();
      }
      if (messageDiv) {
        messageDiv.innerText = "Unliked!";
        setTimeout(() => messageDiv.innerText = "", 2000);
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

  const movie = movieCache.find(m => m.id === parseInt(id, 10));
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
      const btn = document.querySelector(`button[data-movie-id="${id}"]`);
      const messageDiv = document.getElementById(`like-msg-${id}`);
      if (btn) {
        btn.innerText = "Unlike";
        btn.classList.remove("like-btn");
        btn.classList.add("unlike-btn");
        btn.replaceWith(btn.cloneNode(true));
        bindLikeButtons();
      }
      if (messageDiv) {
        messageDiv.innerText = "Liked!";
        setTimeout(() => messageDiv.innerText = "", 2000);
      }
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
        window.location.href = '/app/index.html';
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

    movieCache = likedMovies.map(movie => ({
        id: movie.MovieID,
        original_title: movie.OriginalTitle,
        title: movie.Title,
        overview: movie.Overview,
        release_date: movie.ReleaseDate,
        liked: true
    }));
    movieCache.forEach(renderMovie)

    bindLikeButtons();

  } catch (err) {
    console.error(err);
    document.getElementById('movies-container').innerText = 'Could not retrieve liked movies.';
  }
}

function renderMovie(movie) {
  const container = document.getElementById('movies-container') || document.getElementById('results');
  const movieEl = document.createElement('div');
  movieEl.className = 'movie';

  movieEl.innerHTML = `
  <strong>${movie.title || movie.original_title}</strong><br>
  <small>${movie.release_date}</small><br>
  ${movie.overview}<br>
  <button class="${movie.liked ? 'unlike-btn' : 'like-btn'}" data-movie-id="${movie.id}">
  ${movie.liked ? 'Unlike' : 'Like'}
  </button>
  <div id="like-msg-${movie.id}" class="like-message" style="color: red"></div>`;

  container.appendChild(movieEl);
}

function bindLikeButtons() {
  document.querySelectorAll('.like-btn').forEach(button => {
    button.addEventListener('click', () => {
      const movieID = parseInt(button.dataset.movieId, 10);
      likeMovie(movieID);
    });
  });

  document.querySelectorAll('.unlike-btn').forEach(button => {
    button.addEventListener('click', () => {
      const movieID = parseInt(button.dataset.movieId, 10);
      unlikeMovie(movieID);
    });
  });
  
}

let animationLoop;

function applyMoodTheme(query) {
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');
  const mood = getMoodFromQuery(query);

  cancelAnimationFrame(animationLoop);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (mood) {
    case 'sad': animateRain(ctx, canvas); break;
    default: break;
  }

}

function getMoodFromQuery(query) {
  if (query.includes('sad')) return 'sad';
  if (query.includes('happy')) return 'happy';
  if (query.includes('angry')) return 'angry';
  if (query.includes('calm') || query.includes('peace')) return 'calm';
  return 'default';
}

function animateRain(ctx, canvas) {
  const drops = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    speed: Math.random() * 3 + 2
  }));

  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.style.setProperty('background', 'linear-gradient(to bottom, #3498dbcc, rgb(203, 203, 203))', 'important');
    btn.style.setProperty('color', 'white', 'important');
    btn.style.boxShadow = '0 0 5px rgba(255,255,255,0.3)';
    btn.style.transition = 'background 0.3s ease';
  })

  function draw() {
    ctx.fillStyle = 'rgba(44, 62, 80, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255, 0.3)';
    ctx.lineWdith = 1; 

    drops.forEach(drop => {
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x, drop.y + 10);
      ctx.stroke();

      drop.y += drop.speed;
      if (drop.y > canvas.height) {
        drop.y = 0;
        drop.x = Math.random() * canvas.width;
      }
    });

    animationLoop = requestAnimationFrame(draw);
  }
  draw();
}



