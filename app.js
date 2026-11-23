let eventoInstalacionDiferido = null;
const btnInstalar = document.getElementById('btn-instalar');

// Registrar el Service Worker al cargar la página
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registro) => {
        console.log('Service Worker registrado con éxito:', registro.scope);
      })
      .catch((error) => {
        console.error('Error al registrar el Service Worker:', error);
      });
  });
}

// Interceptar el evento de instalación nativa
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  eventoInstalacionDiferido = event;

  if (btnInstalar) {
    btnInstalar.hidden = false;
  }
});

// Programar el click del botón #btn-instalar con promesas (.then / .catch / .finally)
if (btnInstalar) {
  btnInstalar.addEventListener('click', () => {
    if (!eventoInstalacionDiferido) {
      return;
    }

    eventoInstalacionDiferido.prompt();

    eventoInstalacionDiferido.userChoice
      .then((resultado) => {
        if (resultado.outcome === 'accepted') {
          console.log('El usuario aceptó la instalación de la PWA.');
          btnInstalar.hidden = true;
        } else {
          console.log('El usuario descartó el diálogo de instalación.');
        }
      })
      .catch((error) => {
        console.error('Error durante el proceso de instalación:', error);
      })
      .finally(() => {
        eventoInstalacionDiferido = null;
      });
  });
}

// Respaldo: ocultar el botón si la app se instala desde el menú del navegador
window.addEventListener('appinstalled', () => {
  eventoInstalacionDiferido = null;
  if (btnInstalar) {
    btnInstalar.hidden = true;
  }
});

// ==========================================
// CONTROL DE HARDWARE DE CÁMARA
// ==========================================
let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal

const visorVideo = document.getElementById('visor-camara');
const mensajeEstado = document.getElementById('mensaje-estado');

function actualizarMensajeEstado(texto) {
  if (mensajeEstado) {
    mensajeEstado.textContent = texto;
  }
}

// Detener las pistas activas de hardware
function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop();
    });
    streamActual = null;
  }
}

// Encendido de cámara
function iniciarCamara(modo) {
  detenerCamaraActiva();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('Tu navegador no soporta acceso a la cámara o falta conexión segura (HTTPS).');
    return Promise.reject(new Error('API mediaDevices no disponible'));
  }

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  return navigator.mediaDevices
    .getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;
      visorVideo.style.transform = modo === 'user' ? 'scaleX(-1)' : 'none';
      actualizarMensajeEstado(`Cámara activa (${modo === 'environment' ? 'Trasera' : 'Frontal'})`);
    })
    .catch((error) => {
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    });
}

// ==========================================
// FLUJO DE CONSENTIMIENTO PREVIO Y CONTROLES
// ==========================================

// Paso 1: El usuario pulsa "Solicitar Acceso a Cámara" -> Mostramos aviso explicativo
document.getElementById('btn-preparar-camara').addEventListener('click', () => {
  document.getElementById('aviso-permiso').hidden = false;
});

// Paso 2: El usuario lee el motivo y pulsa "Aceptar y Encender Cámara"
document.getElementById('btn-confirmar-permiso').addEventListener('click', () => {
  document.getElementById('aviso-permiso').hidden = true;
  iniciarCamara(modoCamaraActual);
});

// Paso 3: Botón de Cambio de Cámara (#btn-alternar-camara)
document.getElementById('btn-alternar-camara').addEventListener('click', () => {
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
  iniciarCamara(modoCamaraActual);
});

// Paso 4: Botón de Apagado (#btn-apagar-camara)
document.getElementById('btn-apagar-camara').addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  actualizarMensajeEstado('Cámara apagada. Hardware liberado.');
});