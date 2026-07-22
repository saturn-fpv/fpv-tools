// Shared Sidebar Component for Saturn FPV Tools
// Dynamically builds and injects the sidebar drawer and its styles on both App and Website.
(function () {
  // 1. Helper to determine the environment (initialized inside init() on DOMContentLoaded)
  let isAppWrapper = false;

  // 2. Inject CSS Styles for the Drawer
  const CSS = `
    /* ── DRAWER BASE STYLING ── */
    .drawer-menu {
        position: fixed;
        top: 0;
        right: -320px;
        width: 300px;
        height: 100%;
        background: var(--drawer-bg, rgba(24, 24, 27, 0.95));
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        border-left: 1px solid var(--border, #27272A);
        padding-top: env(safe-area-inset-top, 0px);
        z-index: 2000;
        display: flex;
        flex-direction: column;
        visibility: hidden;
        transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.4s;
        box-shadow: -10px 0 40px rgba(0,0,0,0.5);
        font-family: 'Outfit', sans-serif;
    }
    .drawer-menu.open {
        right: 0 !important;
        visibility: visible !important;
    }
    .drawer-header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border, #27272A);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .drawer-header h2 {
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: var(--text, #FAFAFA);
        text-transform: uppercase;
        margin: 0;
    }
    .drawer-header h2 span:first-child {
        color: var(--orange, #E8722A);
    }
    .sidebar-version {
        font-size: 0.75rem;
        font-weight: 400;
        font-style: italic;
        text-transform: none;
        color: var(--text-muted, #A1A1AA);
        letter-spacing: normal;
        margin-left: 0.4rem;
    }
    .drawer-close {
        background: none;
        border: none;
        color: var(--text-dim, #71717A);
        font-size: 1.5rem;
        cursor: pointer;
        transition: color 0.2s;
        line-height: 1;
    }
    .drawer-close:hover {
        color: var(--text, #FAFAFA);
    }
    .drawer-links {
        list-style: none;
        padding: 0.5rem 0;
        margin: 0;
        overflow-y: auto;
        flex: 1;
    }
    .drawer-links::-webkit-scrollbar {
        width: 4px;
    }
    .drawer-links::-webkit-scrollbar-track {
        background: transparent;
    }
    .drawer-links::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
    }
    body.light-theme .drawer-links::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.15);
    }
    .drawer-item {
        padding: 0.08rem 0.75rem;
    }
    .drawer-item a {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem 0.85rem;
        color: var(--text-muted, #A1A1AA);
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        border-radius: 8px;
        transition: all 0.2s ease;
        border: 1px solid transparent;
    }
    .drawer-item a:hover, .drawer-item.active a {
        color: var(--text, #FAFAFA);
        background: var(--active-item-bg, rgba(232, 114, 42, 0.06));
        border-color: var(--active-item-border, rgba(232, 114, 42, 0.15));
    }
    .drawer-item.active a {
        background: var(--active-item-bg, rgba(232, 114, 42, 0.06));
        border-color: var(--orange, #E8722A);
        font-weight: 600;
    }
    .drawer-item .tool-icon {
        font-size: 1.15rem;
        min-width: 24px;
        text-align: center;
    }
    .drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 1999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .drawer-overlay.visible {
        opacity: 1;
        pointer-events: auto;
    }

    /* ── RESPONSIVE DESKTOP LAYOUT ── */
    @media (min-width: 1024px) {
        .drawer-menu {
            position: fixed;
            top: var(--header-offset-top, 50px);
            right: 0 !important;
            width: 300px;
            height: calc(100% - var(--header-offset-top, 50px));
            border-left: 1px solid var(--border, #27272A);
            border-top: none;
            box-shadow: none;
            background: var(--dark, #111113);
            transform: none !important;
            visibility: visible !important;
        }
        .drawer-close {
            display: none !important;
        }
        /* Offset page body to accommodate persistent sidebar */
        body.has-persistent-sidebar {
            padding-right: 300px !important;
        }
        .drawer-overlay {
            display: none !important;
        }
    }

    /* ── THEME TOGGLE CONTROLS ── */
    .theme-switch-slider {
        position: relative;
        display: inline-block;
        width: 42px;
        height: 22px;
    }
    .theme-switch-slider input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background-color: var(--border, #27272A);
        transition: .25s ease;
        border-radius: 22px;
    }
    .slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 4px;
        bottom: 4px;
        background-color: var(--text-dim, #71717A);
        transition: .25s ease;
        border-radius: 50%;
    }
    input:checked + .slider {
        background-color: rgba(59, 123, 246, 0.15);
        border: 1px solid rgba(59, 123, 246, 0.3);
    }
    input:checked + .slider:before {
        transform: translateX(18px);
        background-color: var(--blue, #3B7BF6);
    }
    .drawer-footer {
        padding: 1rem 1.25rem;
        border-top: 1px solid var(--border, #27272A);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--dark, #111113);
    }
    
    /* ── LIGHT THEME SIDEBAR VARIABLES ── */
    body.light-theme {
        --drawer-bg: rgba(228, 228, 231, 0.95);
        --dark: #E4E4E7;
        --border: #D4D4D8;
        --text: #09090B;
        --text-muted: #27272A;
        --text-dim: #71717A;
        --hover-bg: rgba(9, 9, 11, 0.08);
        --active-item-bg: rgba(232, 114, 42, 0.08);
        --active-item-border: rgba(232, 114, 42, 0.3);
    }
  `;

  // 3. Inject CSS style block
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'sfpv-sidebar-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // 4. Construct and Inject HTML structure
  function injectHTML() {
    // Check if list metadata exists
    if (typeof FPV_TOOLS_LIST === 'undefined') {
      console.error("FPV_TOOLS_LIST is undefined. Make sure tools-list.js is loaded first.");
      return;
    }

    // Set relative path variable for tools based on wrapper vs direct tool page
    const dashboardLink = isAppWrapper ? 'menu.html' : '../tools.html';
    const toolPrefix = isAppWrapper ? 'tools/' : '';

    // Create dynamic links list
    let linksHtml = `
      <li class="drawer-item" id="menu-home">
          <a href="#" onclick="window.sfpvSidebar.selectTool('${dashboardLink}', 'home')">
              <span class="tool-icon">📊</span>Dashboard
          </a>
      </li>
      <li style="border-bottom: 1px solid var(--border, #27272A); margin: 0.5rem 1rem 0.75rem 1rem; list-style: none;"></li>
      <li style="margin: 0.75rem 1rem 0.5rem 1rem; font-size: 0.6875rem; font-weight: 700; color: var(--text-dim, #71717A); text-transform: uppercase; letter-spacing: 0.05em; list-style: none;">Tools</li>
    `;

    FPV_TOOLS_LIST.forEach(tool => {
      linksHtml += `
        <li class="drawer-item" id="menu-${tool.key}">
            <a href="#" onclick="window.sfpvSidebar.selectTool('${toolPrefix}${tool.path}', '${tool.key}')">
                <span class="tool-icon">${tool.icon}</span>${tool.name}
            </a>
        </li>
      `;
    });

    const drawerHtml = `
      <div class="drawer-overlay" id="sfpv-drawer-overlay" onclick="window.sfpvSidebar.close()"></div>
      <div class="drawer-menu" id="sfpv-drawer-menu">
          <div class="drawer-header">
              <h2><span>FPV</span> Tools <span class="sidebar-version">v1.2.1</span></h2>
              <button class="drawer-close" onclick="window.sfpvSidebar.close()">&times;</button>
          </div>
          <ul class="drawer-links">
              ${linksHtml}
          </ul>
          <div class="drawer-footer">
              <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-muted, #A1A1AA); display: flex; align-items: center; gap: 0.5rem;">🌓 Dark Mode</span>
              <label class="theme-switch-slider">
                  <input type="checkbox" id="sfpv-theme-slider" checked onchange="window.sfpvSidebar.toggleTheme(this)">
                  <span class="slider"></span>
              </label>
          </div>
      </div>
    `;

    const container = document.createElement('div');
    container.id = 'sfpv-sidebar-container';
    container.innerHTML = drawerHtml;
    document.body.appendChild(container);
  }

  // 5. Theme Application System
  let currentTheme = localStorage.getItem('fpv-tools-theme') || 'dark';

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('fpv-tools-theme', theme);

    // Sync drawer toggle state
    const slider = document.getElementById('sfpv-theme-slider');
    if (slider) {
      slider.checked = (theme === 'dark');
    }

    if (isAppWrapper && typeof window.applyTheme === 'function') {
      // In App wrapper, delegate to window.applyTheme which handles native bridges and iframe updates
      window.applyTheme(theme);
    } else {
      // Direct website mode: apply classes locally
      if (theme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
      // Propagate theme change to local page context (so direct-loaded tools receive it)
      window.postMessage({ type: 'setTheme', theme: theme }, '*');
    }
  }

  // 6. Navigation and Drawer Interaction APIs
  window.sfpvSidebar = {
    open: function () {
      document.getElementById('sfpv-drawer-menu').classList.add('open');
      document.getElementById('sfpv-drawer-overlay').classList.add('visible');
      
      // Close website navigation main dropdowns if open
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) navLinks.classList.remove('open');
    },

    close: function () {
      document.getElementById('sfpv-drawer-menu').classList.remove('open');
      document.getElementById('sfpv-drawer-overlay').classList.remove('visible');
    },

    toggle: function () {
      const menu = document.getElementById('sfpv-drawer-menu');
      if (menu.classList.contains('open')) {
        this.close();
      } else {
        this.open();
      }
    },

    updateActiveItem: function (key) {
      document.querySelectorAll('.drawer-item').forEach(item => {
        item.classList.remove('active');
      });
      const activeItem = document.getElementById('menu-' + key);
      if (activeItem) activeItem.classList.add('active');
    },

    selectTool: function (path, key) {
      if (isAppWrapper) {
        // App wrapper switches iframe src
        const iframe = document.getElementById('app-iframe');
        if (iframe) iframe.src = path;
        this.updateActiveItem(key);
      } else {
        // Website navigates directly to sibling page
        window.location.href = path;
      }
      this.close();
    },

    toggleTheme: function (checkbox) {
      const nextTheme = checkbox.checked ? 'dark' : 'light';
      applyTheme(nextTheme);
    }
  };

  // 7. Initialization on DOM Load
  function init() {
    isAppWrapper = (document.getElementById('app-iframe') !== null);
    injectStyles();
    injectHTML();
    applyTheme(currentTheme);

    // Add persistent sidebar body class if width >= 1024px and not inside the app wrapper
    if (window.innerWidth >= 1024 && !isAppWrapper) {
      document.body.classList.add('has-persistent-sidebar');
    }

    // Track resize events to apply/remove persistent class
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024 && !isAppWrapper) {
        document.body.classList.add('has-persistent-sidebar');
      } else {
        document.body.classList.remove('has-persistent-sidebar');
      }
    });

    // Detect initial active tool if we are in a tool page directly
    if (!isAppWrapper) {
      const currentFilename = window.location.pathname.split('/').pop();
      if (currentFilename === 'tools.html') {
        window.sfpvSidebar.updateActiveItem('home');
      } else if (typeof FPV_TOOLS_LIST !== 'undefined') {
        const activeTool = FPV_TOOLS_LIST.find(tool => tool.path === currentFilename);
        if (activeTool) {
          window.sfpvSidebar.updateActiveItem(activeTool.key);
        }
      }
    } else {
      window.sfpvSidebar.updateActiveItem('home');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
