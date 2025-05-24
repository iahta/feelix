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
  const userHomeButton = document.getElementById('user-button');
  if (userHomeButton) {
    userHomeButton.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/app/user.html';
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


//test more with fetch
async function fetchWithAuth(url, options = {}) {
  const accessToken = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {...options, headers});

  if (response.status === 401) {
    const refreshSuccess = await tryRefreshToken();
    if (refreshSuccess) {
      const newAccessToken = localStorage.getItem('token');
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      //refresh// fetch doesnt work. 
      return await fetch(url, { ...options, headers });
    } else {
      window.location.href = '/app/index.html';
    }
  }
  return response;   
}

async function tryRefreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  try {
      const res = await fetch('/api/refresh', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`
          }
      });

      if (res.ok) {
          const refreshData = await res.json();
          localStorage.setItem('token', refreshData.token);
          return true;
      }
  } catch (err) {
      console.error('Refresh token failed', err);
  }
  return false;
}


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

  fetchWithAuth (`/api/search?q=${encodeURIComponent(query)}`, {
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

    slideMovies();

    bindLikeButtons();

    applyMoodTheme(query);
  })
  .catch(err => alert("Error: " + err.message));
}

var slideIndex = 1;
function slideMovies() {
  const container = document.getElementById('results');
  const buttons = `<button class"w3-button w3-display-left" id="btn-left">&#10094;</button>
                  <button class"w3-button w3-display-right" id="btn-right">&#10095;</button>`;
  const channels = document.createElement('scroll-buttons');
  channels.innerHTML = buttons
  container.appendChild(channels);
  showDivs(slideIndex);
  bindScrollButtons();

}

function bindScrollButtons() {
  const leftButton = document.getElementById('btn-left')
  leftButton.addEventListener('click', function(e) {
    e.preventDefault();
    plusDivs(-1);
  });
  
  const rightButton = document.getElementById('btn-right')
  rightButton.addEventListener('click', function(e) {
    e.preventDefault();
    plusDivs(1);
  });
}

function plusDivs(n) {
  showDivs(slideIndex += n);
}

function showDivs(n) {
  var i;
  var x = document.getElementsByClassName('movie');
  if (n > x.length) {slideIndex = 1}
  if (n < 1) {slideIndex = x.length};
  for (i = 0; i < x.length; i++) {
    x[i].style.display = "none";
  }
  x[slideIndex-1].style.display = "block";
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
    window.location.href = '/app/index.html';
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
        liked: true,
        streaming: movie.StreamingUS || []
    }));
    movieCache.forEach(renderMovie)

    bindLikeButtons();

  } catch (err) {
    console.error(err);
    const container = document.getElementById('movies-container');
    container.innerHTML = '<p style="color: red">Could not retrieve liked movies.</p>';
  }
}

function renderMovie(movie) {
  const container = document.getElementById('movies-container') || document.getElementById('results');
  if (!container) {
    console.error('No container element found to render movies.');
    return;
  }
  const movieEl = document.createElement('div');
  movieEl.className = 'movie';

  let streamingHtml = '';
  if (movie.liked && Array.isArray(movie.streaming) && movie.streaming.length > 0) {
    streamingHtml = `<h4>Streaming Options:</h4><ul>`;
    streamingHtml += movie.streaming.map(opt => `
      <li>
        <a href="${opt.link}"><img src="${opt.service.imageSet.lightThemeImage}" alt="${opt.service.name} logo" style="height: 24px;"></a>
        (${opt.type})
        ${opt.price ? ` - ${opt.price.formatted}` : ''}
      </li>
    `).join('');
    streamingHtml += `</ul>`;
  }

  movieEl.innerHTML = `
  <strong>${movie.title || movie.original_title}</strong><br>
  <small>${movie.release_date}</small><br>
  ${movie.overview}<br>
  ${streamingHtml}
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

  function resetCanvas(ctx, canvas) {
    cancelAnimationFrame(animationLoop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
    canvas.style.background = '';
  }
  resetCanvas(ctx, canvas);
  
  switch (mood) {
    case 'sad': animateRain(ctx, canvas); break;
    case 'angry': animateFire(ctx, canvas); break;
    case 'happy': animateBeach(ctx, canvas); break;
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

function animateFire(ctx, canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.setProperty('background', 'rgba(127, 0, 0, 0.42)');
  document.body.style.setProperty('color', 'rgba(255, 148, 0, 1)', 'important');

  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.style.setProperty('background', 'linear-gradient(to top, #ff4e50, #f9a123)', 'important');
    btn.style.setProperty('color', 'white', 'important');
    btn.style.boxShadow = '0 0 5px rgba(255,255,255,0.3)';
    btn.style.transition = 'background 0.3s ease';
  })

  let particles = [];

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = canvas.height + Math.random() * 100;
      this.radius = Math.random() * 40 + 10;
      this.speedY = Math.random() * -1.5 - 0.5;
      this.life = 100;
      this.alpha = 1;
    }

    update() {
      this.y += this.speedY;
      this.alpha -= 0.01;
      this.life--;
      if (this.life <= 0 || this.alpha <= 0) {
        this.reset();
      }
    }

    draw(){
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius
      );

      gradient.addColorStop(0, `rgba(255, 255, 200, ${this.alpha})`);
      gradient.addColorStop(0.2, `rgba(255, 165, 0, ${this.alpha})`);
      gradient.addColorStop(0.4, `rgba(255, 69, 0, ${this.alpha * 0.8})`);
      gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initFire() {
    particles = [];
    for (let i = 0; i < 200; i++) {
      particles.push(new Particle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    animationLoop = requestAnimationFrame(animate);
  }

  initFire();
  animate();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

}

function animateBeach(ctx, canvas) {
  let startTime = null;
// Helper to draw a gradient rectangle
  function drawGradientRect(x, y, width, height, colorStops, vertical = true) {
    const gradient = vertical
      ? ctx.createLinearGradient(x, y, x, y + height)
      : ctx.createLinearGradient(x, y, x + width, y);

    for (const [offset, color] of colorStops) {
      gradient.addColorStop(offset, color);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }

  // Draw the sky
  function drawSky() {
    drawGradientRect(0, 0, canvas.width, canvas.height * 0.4, [
      [0, '#037ccb'],
      [1, '#82ccef']
    ]);
  }

  // Draw the sea (semi-circle / wave shape)
  function drawSea(offsetY = 1) {
    const baseSeaY = canvas.height * 0.4;
    const seaY = baseSeaY + offsetY;
    const seaHeight = canvas.height * 0.3;
    const radiusX = canvas.width;
    const radiusY = seaHeight;

    const gradient = ctx.createLinearGradient(0, seaY, 0, seaY + seaHeight);
    gradient.addColorStop(0, 'rgba(8, 122, 193, 1)');
    gradient.addColorStop(0.25, 'rgba(18, 156, 192, 1)');
    gradient.addColorStop(0.5, 'rgba(42, 212, 229, 1)');
    gradient.addColorStop(0.75, 'rgba(150, 233, 239, 1)');
    gradient.addColorStop(1, 'rgba(222, 236, 211, 1)');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, seaY, radiusX, radiusY, 0, Math.PI, 0, true);
    ctx.lineTo(0, seaY);
    ctx.closePath();
    ctx.fill();
  }

  // Draw wet sand (similar shape to sea)
  function drawWetSand() {
    const y = canvas.height * 0.55;
    const height = canvas.height * 0.25;
    ctx.fillStyle = '#ecc075';
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, y, canvas.width, height, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = '#ecc075';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 10;
  }

  // Draw dry sand
  function drawSand() {
    const y = canvas.height * 0.65;
    const height = canvas.height * 0.35;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fdf1d7';
    ctx.fillRect(0, y, canvas.width, height);
  }

  // Draw palm tree trunk
  function drawTrunk() {
    ctx.fillStyle = '#aa8366';
    const x = canvas.width / 2 - 15;
    const y = canvas.height * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 30, y - 100);
    ctx.lineTo(x + 45, y - 100);
    ctx.lineTo(x + 15, y);
    ctx.closePath();
    ctx.fill();
  }

  // Draw a leaf
  function drawLeaf(x, y, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 100, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw palm leaves
  function drawLeaves() {
    const x = canvas.width / 2 + 10;
    const y = canvas.height * 0.25;
    drawLeaf(x, y, -0.3, '#395d00');
    drawLeaf(x, y, 0.2, '#5c7301');
    drawLeaf(x, y, -0.5, '#465a05');
  }

  // Full draw
  function drawScene(timeElapsed) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const waveOffsetY = Math.sin(timeElapsed / 1000 * Math.PI * 2) * 20;
    drawSky();
    drawSea(waveOffsetY);
    drawWetSand();
    drawSand();
    drawTrunk();
    drawLeaves();
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const timeElapsed = timestamp - startTime;

    drawScene(timeElapsed);
    animationLoop = requestAnimationFrame(animate);
  }
  animationLoop = requestAnimationFrame(animate);

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}