/* ========================================
   Splash Screen
   ======================================== */

import { navigate } from '../router.js';
import { isLoggedIn, getRole, getHomeRoute } from '../auth.js';

export default function splashPage(app) {
  app.innerHTML = `
    <div class="splash-screen" id="splashScreen">
      <div class="splash-logo">
        <span class="material-icons-outlined">apartment</span>
      </div>
      <div class="splash-title">University College of Engineering Ariyalur</div>
      <div class="splash-subtitle">UCE IT</div>
      <div class="splash-loader"><div class="splash-loader-bar"></div></div>
      <div class="splash-footer">Powered by MooN Software Solutions</div>
    </div>
  `;

  const timer = setTimeout(() => {
    if (isLoggedIn()) {
      navigate(getHomeRoute(getRole()));
    } else {
      navigate('#/login');
    }
  }, 2800);

  return () => clearTimeout(timer);
}
