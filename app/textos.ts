export type Idioma = "es" | "en";

export const IDIOMAS: { codigo: Idioma; nombre: string }[] = [
  { codigo: "es", nombre: "Español" },
  { codigo: "en", nombre: "English" },
];

export const textos = {
  es: {
    // Inicio
    lema: "Calistenia y pino · Fuengirola",
    intro: "¿Qué te interesa?",
    online: "Entrenamiento online",
    presencial: "Entrenamiento presencial",
    academia: "Academia",
    entrar: "Entrar",
    idioma: "Idioma",
    pruebaEnlace: "Crear cuenta para la clase de prueba",
    volver: "Volver",

    // Campos comunes
    correo: "Correo electrónico",
    contrasena: "Contraseña",
    contrasenaAyuda: "Mínimo 8 caracteres",
    repetirContrasena: "Repite la contraseña",
    cargando: "Un momento…",

    // Registro
    registroTitulo: "Crear cuenta",
    registroIntro: "Para reservar tu clase de prueba gratuita.",
    registroBoton: "Crear cuenta",
    registroEnviado: "Revisa tu correo",
    registroEnviadoTexto:
      "Te hemos enviado un enlace para confirmar tu cuenta. Ábrelo para continuar.",
    yaTienesCuenta: "¿Ya tienes cuenta? Entrar",

    // Entrar
    entrarTitulo: "Entrar",
    entrarBoton: "Entrar",
    olvidaste: "¿Has olvidado tu contraseña?",
    crearCuenta: "Crear cuenta nueva",
    errorEnlace: "El enlace ha caducado o no es válido. Pide uno nuevo.",
    errorCredenciales: "Correo o contraseña incorrectos.",

    // Recuperar
    recuperarTitulo: "Recuperar contraseña",
    recuperarIntro: "Te enviaremos un enlace para elegir una contraseña nueva.",
    recuperarBoton: "Enviar enlace",
    recuperarEnviado:
      "Si el correo existe, recibirás un enlace en unos minutos.",

    // Crear contraseña
    contrasenaTitulo: "Elige tu contraseña",
    contrasenaIntro: "Con ella entrarás a la app a partir de ahora.",
    contrasenaBoton: "Guardar contraseña",
    errorContrasenaCorta: "La contraseña debe tener al menos 8 caracteres.",
    errorContrasenaIgual: "Las contraseñas no coinciden.",

    // Datos obligatorios
    datosTitulo: "Tus datos",
    datosIntro: "Necesitamos estos datos para poder empezar. Todos son obligatorios.",
    nombre: "Nombre",
    apellidos: "Apellidos",
    telefono: "Teléfono",
    dni: "DNI / NIE",
    fechaNacimiento: "Fecha de nacimiento",
    emergenciaTitulo: "Contacto de emergencia",
    emergenciaNombre: "Nombre del contacto",
    emergenciaTelefono: "Teléfono del contacto",
    aceptoPrivacidad: "He leído y acepto la política de privacidad",
    aceptoTerminos: "He leído y acepto los términos y condiciones",
    verPrivacidad: "Política de privacidad",
    verTerminos: "Términos y condiciones",
    guardar: "Guardar y continuar",
    errorCampo: "Revisa este campo.",
    errorDni: "El DNI/NIE no es válido.",
    errorTelefono: "El teléfono no es válido.",
    errorFecha: "La fecha no es válida.",
    errorAceptar: "Debes aceptar para continuar.",
    errorDniRepetido:
      "Ese DNI/NIE ya está registrado. Escribe a Miriam para resolverlo.",
    errorGeneral: "Ha ocurrido un error. Inténtalo de nuevo.",

    // Cuenta
    hola: "Hola",
    tuRol: "Tu tipo de cuenta",
    tusServicios: "Tus servicios",
    sinServicios: "Todavía no tienes ningún servicio activo.",
    salir: "Cerrar sesión",
    proximamente: "Muy pronto podrás reservar clases aquí.",
    rol_invitado: "Invitado (clase de prueba)",
    rol_alumno: "Alumno",
    rol_admin: "Administradora",
    servicio_grupal: "Clases grupales",
    servicio_individual: "Entrenamiento individual",
    servicio_online: "Entrenamiento online",

    // Legal
    legalPendiente:
      "Texto pendiente. Miriam aportará el texto legal definitivo antes de abrir la app a alumnos.",
  },
  en: {
    lema: "Calisthenics & handstand · Fuengirola",
    intro: "What are you interested in?",
    online: "Online training",
    presencial: "In-person training",
    academia: "Academy",
    entrar: "Log in",
    idioma: "Language",
    pruebaEnlace: "Create an account for the trial class",
    volver: "Back",

    correo: "Email",
    contrasena: "Password",
    contrasenaAyuda: "At least 8 characters",
    repetirContrasena: "Repeat password",
    cargando: "One moment…",

    registroTitulo: "Create account",
    registroIntro: "To book your free trial class.",
    registroBoton: "Create account",
    registroEnviado: "Check your email",
    registroEnviadoTexto:
      "We sent you a link to confirm your account. Open it to continue.",
    yaTienesCuenta: "Already have an account? Log in",

    entrarTitulo: "Log in",
    entrarBoton: "Log in",
    olvidaste: "Forgot your password?",
    crearCuenta: "Create a new account",
    errorEnlace: "The link has expired or is not valid. Request a new one.",
    errorCredenciales: "Wrong email or password.",

    recuperarTitulo: "Reset password",
    recuperarIntro: "We'll send you a link to choose a new password.",
    recuperarBoton: "Send link",
    recuperarEnviado: "If the email exists, you'll get a link in a few minutes.",

    contrasenaTitulo: "Choose your password",
    contrasenaIntro: "You'll use it to log in from now on.",
    contrasenaBoton: "Save password",
    errorContrasenaCorta: "The password must be at least 8 characters long.",
    errorContrasenaIgual: "The passwords don't match.",

    datosTitulo: "Your details",
    datosIntro: "We need these details to get started. All fields are required.",
    nombre: "First name",
    apellidos: "Last name",
    telefono: "Phone",
    dni: "ID / NIE number",
    fechaNacimiento: "Date of birth",
    emergenciaTitulo: "Emergency contact",
    emergenciaNombre: "Contact name",
    emergenciaTelefono: "Contact phone",
    aceptoPrivacidad: "I have read and accept the privacy policy",
    aceptoTerminos: "I have read and accept the terms and conditions",
    verPrivacidad: "Privacy policy",
    verTerminos: "Terms and conditions",
    guardar: "Save and continue",
    errorCampo: "Please check this field.",
    errorDni: "The ID / NIE number is not valid.",
    errorTelefono: "The phone number is not valid.",
    errorFecha: "The date is not valid.",
    errorAceptar: "You must accept to continue.",
    errorDniRepetido:
      "That ID / NIE is already registered. Write to Miriam to sort it out.",
    errorGeneral: "Something went wrong. Please try again.",

    hola: "Hi",
    tuRol: "Your account type",
    tusServicios: "Your services",
    sinServicios: "You don't have any active service yet.",
    salir: "Log out",
    proximamente: "Soon you'll be able to book classes here.",
    rol_invitado: "Guest (trial class)",
    rol_alumno: "Student",
    rol_admin: "Administrator",
    servicio_grupal: "Group classes",
    servicio_individual: "Individual training",
    servicio_online: "Online training",

    legalPendiente:
      "Text pending. Miriam will provide the final legal text before the app is opened to students.",
  },
} satisfies Record<Idioma, Record<string, string>>;

export type ClaveTexto = keyof (typeof textos)["es"];
