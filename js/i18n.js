// Simple i18n helper for FoodTales
(function(){
  const translations = {
    es: {
      // Navigation
      home: 'Inicio',
      map: 'Mapa',
      favorites: 'Favoritos',
      profile: 'Perfil',

      // Buttons & actions
      exploreEvent: 'Explorar Evento',
      exploreMap: '📍 Explorar en el Mapa',
      viewOnMap: 'Ver en el Mapa',
      viewInMaps: 'Ver en Maps',
      viewDetails: 'Ver Detalles',
      comparePlaces: 'Comparar Lugares',
      tryThis: '¡Pruébalo!',
      applyFilters: '🔍 Aplicar filtros',
      saveProfile: '💾 Guardar perfil',
      logout: '🚪 Cerrar Sesión',

      // Filters & categories
      nearbyDishes: 'Platos Cercanos',
      exploreRoutes: 'Explorar Rutas',
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      desserts: 'Postres',
      juices: 'Jugos',
      fastFood: 'Comida rápida',
      traditional: 'Tradicional',
      all: 'Todos',
      flavor: 'Sabor',
      timeMax: 'Tiempo máximo',
      priceMax: 'Precio máximo',
      distanceMax: 'Distancia máxima',
      minRating: 'Calificación mínima',

      // Dish / detail
      dishHistory: 'Historia del Plato',
      ingredients: 'Ingredientes',
      funFacts: 'Datos Curiosos',
      whatDinersSay: 'Qué opinan los comensales',
      watchAndLearn: '📺 Mira y Aprende',
      dishNotFound: 'Plato no encontrado',
      returnHome: 'Volver al inicio',
      favoritesSaved: 'Guardado en Favoritos',
      // Event-specific
      viewEventMap: 'Ver Mapa del Evento',
      historyCulture: '📜 Historia y Cultura',

      // Misc
      back: 'Volver',
      allCapsExploreEvent: 'Explorar Evento',
      seeMore: 'Ver más →',
      saveSuccess: 'Perfil guardado correctamente',
        changesNotSaved: 'No se guardaron los cambios',
      // Home / general
      whatToEatNow: '🍽️ ¿Qué quieres comer ahora?',
      bestBurgerFestival: 'El mejor festival de hamburguesas de la ciudad',
      // Profile / UI
      profileTitle: 'Perfil',
      theme: 'Tema',
      darkMode: 'Modo oscuro',
      lightMode: 'Modo claro',
      noActiveSession: 'No hay sesión activa',
      confirmOverwriteProfile: 'Ya existe un perfil guardado. ¿Deseas sobrescribirlo?',
      name: 'Nombre',
      email: 'Correo',
      preferences: 'Preferencias',
      settings: 'Configuración',
      changeLanguage: 'Cambiar idioma',
      // Index / auth
      welcome: 'Bienvenidx',
      email: '📧 Correo electrónico',
      password: '🔒 Contraseña',
      loginBtn: 'Iniciar sesión',
      goToRegister: '✨ ¿No tienes cuenta? Créala aquí',
      createAccount: 'Crear cuenta',
      fullNameReg: '🧑‍🍳 Nombre completo',
      confirmPassword: '🔁 Confirmar contraseña',
      languagePref: '🌍 Idioma preferido',
      registerBtn: 'Registrarme',
      goToLogin: '⬅️ Ya tengo cuenta, iniciar sesión',
      logoSub: 'sabores que cuentan historias',
      emailPlaceholder: 'tú@ejemplo.com',
      namePlaceholder: 'Tu nombre',
      passwordPlaceholder: 'Mínimo 4 caracteres',
      confirmPlaceholder: 'Repite la contraseña',
      // validation messages
      allFieldsRequired: '❌ Todos los campos son obligatorios',
      invalidEmail: '❌ Correo inválido',
      passwordTooShort: '❌ La contraseña debe tener al menos 4 caracteres',
      passwordsMismatch: '❌ Las contraseñas no coinciden',
      emailRegistered: '⚠️ Este correo ya está registrado',
      accountCreatedRedirect: '✅ Cuenta creada. Redirigiendo...',
      completeAllFields: '❌ Completa todos los campos',
      invalidLogin: '❌ Correo o contraseña incorrectos',
      loggingIn: '✅ Ingresando...',

      // Profile / placeholders
      uploadPhoto: '📷 Subir foto',
      defaultPhoto: '🔄 Predeterminada',
      personalInfo: 'Información personal',
      fullName: 'Nombre completo *',
      birthDate: 'Fecha de nacimiento',
      age: 'Edad',
      nationality: 'Nacionalidad',
      languagePref: 'Idioma preferido',
      currency: 'Moneda',
      healthData: 'Datos físicos y salud',
      height: 'Altura (cm)',
      weight: 'Peso (kg)',
      gender: 'Género',
      selectOption: 'Selecciona',
      female: 'Femenino',
      male: 'Masculino',
      nonBinary: 'No binario',
      preferNot: 'Prefiero no decir',
      medicalConditions: 'Condiciones médicas',
      diabetes: 'Diabetes',
      hypertension: 'Hipertensión',
      celiac: 'Celiaquía',
      cholesterol: 'Colesterol alto',
      other: 'Otras',
      allergies: 'Alergias alimentarias',
      addAllergy: '+ Añadir',
      location: 'Ubicación',
      cityCountry: 'Ciudad / País',
      namePlaceholder: 'María García',
      nationalityPlaceholder: 'Ej: Colombiana',
      allergyPlaceholder: 'Ej: mariscos, gluten, lácteos...',
      locationPlaceholder: 'Bogotá, Colombia',
      agePlaceholder: '-- años'
    },
    en: {
      // Navigation
      home: 'Home',
      map: 'Map',
      favorites: 'Favorites',
      profile: 'Profile',

      // Buttons & actions
      exploreEvent: 'Explore Event',
      exploreMap: '📍 Explore on Map',
      viewOnMap: 'View on Map',
      viewInMaps: 'View in Maps',
      viewDetails: 'View Details',
      comparePlaces: 'Compare Places',
      tryThis: 'Go Try This',
      applyFilters: '🔍 Apply filters',
      saveProfile: '💾 Save Profile',
      logout: '🚪 Log Out',

      // Filters & categories
      nearbyDishes: 'Nearby Dishes',
      exploreRoutes: 'Explore Routes',
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      desserts: 'Desserts',
      juices: 'Juices',
      fastFood: 'Fast Food',
      traditional: 'Traditional',
      all: 'All',
      flavor: 'Flavor',
      timeMax: 'Maximum time',
      priceMax: 'Maximum price',
      distanceMax: 'Maximum distance',
      minRating: 'Minimum rating',

      // Dish / detail
      dishHistory: 'Dish History',
      ingredients: 'Ingredients',
      funFacts: 'Fun Facts',
      whatDinersSay: 'What diners say',
      watchAndLearn: '📺 Watch and Learn',
      dishNotFound: 'Dish not found',
      returnHome: 'Back to home',
      favoritesSaved: 'Saved to Favorites',
      // Event-specific
      viewEventMap: 'View Event Map',
      historyCulture: '📜 History & Culture',

      // Misc
      back: 'Back',
      allCapsExploreEvent: 'Explore Event',
      seeMore: 'See more →',
      saveSuccess: 'Profile saved successfully',
        changesNotSaved: 'Changes not saved',
      // Home / general
      whatToEatNow: '🍽️ What do you want to eat now?',
      bestBurgerFestival: 'The best burger festival in town',
      // Profile / UI
      profileTitle: 'Profile',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      noActiveSession: 'No active session',
      confirmOverwriteProfile: 'A profile already exists. Overwrite it?',
      name: 'Name',
      email: 'Email',
      preferences: 'Preferences',
      settings: 'Settings',
      changeLanguage: 'Change Language',
      // Index / auth
      welcome: 'Welcome',
      email: '📧 Email',
      password: '🔒 Password',
      loginBtn: 'Log in',
      goToRegister: "✨ Don't have an account? Create one",
      createAccount: 'Create account',
      fullNameReg: '🧑‍🍳 Full name',
      confirmPassword: '🔁 Confirm password',
      languagePref: '🌍 Preferred language',
      registerBtn: 'Sign up',
      goToLogin: '⬅️ Already have an account? Log in',
      logoSub: 'flavors that tell stories',
      emailPlaceholder: 'you@example.com',
      namePlaceholder: 'Your name',
      passwordPlaceholder: 'Minimum 4 characters',
      confirmPlaceholder: 'Repeat password',
      // validation messages
      allFieldsRequired: '❌ All fields are required',
      invalidEmail: '❌ Invalid email',
      passwordTooShort: '❌ Password must be at least 4 characters',
      passwordsMismatch: '❌ Passwords do not match',
      emailRegistered: '⚠️ This email is already registered',
      accountCreatedRedirect: '✅ Account created. Redirecting...',
      completeAllFields: '❌ Complete all fields',
      invalidLogin: '❌ Incorrect email or password',
      loggingIn: '✅ Logging in...',

      // Profile / placeholders
      uploadPhoto: '📷 Upload photo',
      defaultPhoto: '🔄 Default',
      personalInfo: 'Personal information',
      fullName: 'Full name *',
      birthDate: 'Birth date',
      age: 'Age',
      nationality: 'Nationality',
      languagePref: 'Preferred language',
      currency: 'Currency',
      healthData: 'Health & physical data',
      height: 'Height (cm)',
      weight: 'Weight (kg)',
      gender: 'Gender',
      selectOption: 'Select',
      female: 'Female',
      male: 'Male',
      nonBinary: 'Non-binary',
      preferNot: 'Prefer not to say',
      medicalConditions: 'Medical conditions',
      diabetes: 'Diabetes',
      hypertension: 'Hypertension',
      celiac: 'Celiac disease',
      cholesterol: 'High cholesterol',
      other: 'Other',
      allergies: 'Food allergies',
      addAllergy: '+ Add',
      location: 'Location',
      cityCountry: 'City / Country',
      namePlaceholder: 'Maria Garcia',
      nationalityPlaceholder: 'e.g., Colombian',
      allergyPlaceholder: 'e.g., shellfish, gluten, dairy...',
      locationPlaceholder: 'Bogotá, Colombia',
      agePlaceholder: '-- years'
    }
  };

  function getLang() {
    return localStorage.getItem('foodtales-language') || 'es';
  }

  function t(key) {
    const lang = getLang();
    return (translations[lang] && translations[lang][key]) || translations['es'][key] || key;
  }

  function applyLanguage() {
    const lang = getLang();
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr');
      const val = (translations[lang] && translations[lang][key]) || translations['es'][key] || '';
      if (!attr || attr === 'text') {
        el.textContent = val;
      } else {
        el.setAttribute(attr, val);
      }
    });
    // callback for pages that need to react when language changes
    try { if (window.onLanguageChange) window.onLanguageChange(lang); } catch (e) {}
  }

  function setLanguage(code) {
    // accept 'es'|'en' or full words
    const c = (code === 'en' || code === 'es') ? code : (code && code.toLowerCase().startsWith('e') && code.toLowerCase().includes('ing') ? 'en' : 'es');
    localStorage.setItem('foodtales-language', c);
    applyLanguage();
  }

  window.i18n = { t, applyLanguage, setLanguage, getLang };

  // Apply once on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLanguage);
  } else {
    applyLanguage();
  }

})();
