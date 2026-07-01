// =========================================================================
// 1. BASE DE DATOS GLOBAL, ACUMULATIVA Y ETIQUETADA
// =========================================================================
let dataPool = { clases: {}, razas: {}, trasfondos: [] };
let librosCargadosNombres = []; 

// CANDADO DE ESCALABILIDAD: Agrega acá los nombres de los archivos exactos que pongas en la carpeta DB
const LIBROS_OFICIALES = {
    'dnd_2024_phb.csv': 'Manual del Jugador',
    'dnd_2024_eberron.csv': 'DND 2024 Eberron',
    'dnd_2024_hof.csv': 'Héroes de Faerûn'
};

// Caché de memoria en tiempo de ejecución para evitar re-descargas innecesarias
let cacheLibrosNativos = {};

// =========================================================================
// 2. REFERENCIAS AL DOM
// =========================================================================
const fileInput = document.getElementById('csv-file');
const generateBtn = document.getElementById('generate-btn');
const loadedFilesList = document.getElementById('loaded-files-list');
const toastContainer = document.getElementById('toast-container');
const containerSubclass = document.getElementById('container-subclass');
const containerSubrace = document.getElementById('container-subrace');
const resultBox = document.getElementById('result-box');
const clearBtn = document.getElementById('clear-btn'); 

// =========================================================================
// FUNCIÓN AUXILIAR: GENERADOR DE NOTIFICACIONES TOAST
// =========================================================================
function mostrarNotificacion(mensaje, tipo = "success") {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const icono = tipo === "success" ? "✓" : "⚠️";
    toast.innerHTML = `<span>${icono} ${mensaje}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

// =========================================================================
// PROCESADOR AUTOMÁTICO DE MANUALES NATIVOS AL INICIAR LA APP
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const gridNativo = document.getElementById('native-books-grid');
    if (!gridNativo) return;

    // Obtenemos los nombres de los archivos reales en un array
    const archivosAProcesar = Object.keys(LIBROS_OFICIALES);

    archivosAProcesar.forEach(nombreArchivo => {
        // En vez de limpiar el texto con regex, levantamos el título traducido del objeto
        const tituloAmigable = LIBROS_OFICIALES[nombreArchivo];

        // Creamos la tarjeta del switch de forma dinámica en el DOM
        const card = document.createElement('label');
        card.className = 'libro-switch-card';
        card.innerHTML = `
            <input type="checkbox" id="chk-${nombreArchivo.replace('.', '-')}" checked>
            <span class="switch-box"></span>
            <span class="libro-titulo" style="text-transform: uppercase;">${tituloAmigable}</span>
        `;
        gridNativo.appendChild(card);

        // Capturamos el input que acabamos de crear para darle su evento reactivo
        const checkbox = card.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            toggleLibroNativo(nombreArchivo, e.target.checked);
        });

        // Hacemos el fetch automático al servidor (Carpeta DB/)
        fetch(`DB/${nombreArchivo}`)
            .then(response => {
                if (!response.ok) throw new Error();
                return response.text();
            })
            .then(contenidoCsv => {
                // Guardamos en caché y lo inyectamos al pool inicial
                cacheLibrosNativos[nombreArchivo] = contenidoCsv;
                appendCSVToPool(contenidoCsv, nombreArchivo);
                verificarBotones();
            })
            .catch(() => {
                console.error(`No se pudo precargar DB/${nombreArchivo}`);
                checkbox.checked = false;
                mostrarNotificacion(`No se pudo cargar automáticamente "${tituloAmigable}".`, "error");
            });
    });
});

// Cambiar el estado de un libro nativo desde el switch sin ir a internet otra vez
window.toggleLibroNativo = function(nombreLibro, estaActivo) {
    if (estaActivo) {
        const contenidoGuardado = cacheLibrosNativos[nombreLibro];
        if (contenidoGuardado) {
            appendCSVToPool(contenidoGuardado, nombreLibro);
            mostrarNotificacion(`Activado: "${nombreLibro}" en el pool.`, "success");
        }
    } else {
        eliminarDatosPorOrigen(nombreLibro);
        mostrarNotificacion(`Desactivado: Se aislaron los datos de "${nombreLibro}".`, "error");
    }
    verificarBotones();
};

// =========================================================================
// 3. EVENTOS DE CARGA DE ARCHIVOS PERSONALIZADOS DEL USUARIO (INPUT CSV)
// =========================================================================
if (fileInput) {
    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (files.length === 0) return;

        let archivosFallidos = [];
        let archivosExitososEnEstaTanda = [];

        let loaders = Array.from(files).map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const contenido = event.target.result;
                    const esValido = appendCSVToPool(contenido, file.name);
                    
                    if (esValido === false) {
                        archivosFallidos.push(file.name);
                    } else {
                        archivosExitososEnEstaTanda.push(file.name);
                        if (!librosCargadosNombres.includes(file.name)) {
                            librosCargadosNombres.push(file.name);
                        }
                    }
                    resolve();
                };
                reader.readAsText(file, 'UTF-8');
            });
        });

        Promise.all(loaders).then(() => {
            actualizarListaVisual(); 
            verificarBotones();

            if (archivosFallidos.length > 0) {
                archivosFallidos.forEach(nombre => {
                    mostrarNotificacion(`¡El libro "${nombre}" no tiene el formato adecuado!`, "error");
                });
            } else if (archivosExitososEnEstaTanda.length > 0) {
                mostrarNotificacion("Base de datos actualizada con éxito.", "success");
            }
            fileInput.value = ""; 
        });
    });
}

function appendCSVToPool(text, origenArchivo) {
    if (!text || text.trim() === "") return false;
    const lines = text.split(/\r?\n|\r/).filter(line => line.trim() !== "");
    if (lines.length <= 1) return false;

    let seProcesaronDatosValidos = false;
    const tiposValidos = ["Clase", "Subclase", "Raza", "Subraza", "Trasfondo"];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const columnas = lines[i].split(',');
        
        // PARCHE DE SEGURIDAD EXTRA: Limpieza estricta de saltos de línea carriage-return (\r)
        const tipo = columnas[0] ? columnas[0].replace(/\r/g, "").trim() : "";
        const nombre = columnas[1] ? columnas[1].replace(/\r/g, "").trim() : "";
        const dependencia = columnas[2] ? columnas[2].replace(/\r/g, "").trim() : "";

        if (!tiposValidos.includes(tipo)) continue;
        seProcesaronDatosValidos = true;

        switch (tipo) {
            case "Clase":
                if (!dataPool.clases[nombre]) {
                    const primarios = dependencia ? dependencia.split('-') : [];
                    // Modificado: origen pasa a ser un Array (orígenes) para soportar múltiples fuentes
                    dataPool.clases[nombre] = { subclases: [], primarios: primarios, origenes: [origenArchivo] };
                } else {
                    if (!dataPool.clases[nombre].origenes.includes(origenArchivo)) {
                        dataPool.clases[nombre].origenes.push(origenArchivo);
                    }
                }
                break;
            case "Subclase":
                if (!dataPool.clases[dependencia]) {
                    dataPool.clases[dependencia] = { subclases: [], primarios: [], origenes: [origenArchivo] };
                }
                if (!dataPool.clases[dependencia].subclases.some(s => s.nombre === nombre)) {
                    dataPool.clases[dependencia].subclases.push({ nombre: nombre, origen: origenArchivo });
                }
                break;
            case "Raza":
                if (!dataPool.razas[nombre]) {
                    dataPool.razas[nombre] = { subrazas: [], origenes: [origenArchivo] };
                } else {
                    if (!dataPool.razas[nombre].origenes.includes(origenArchivo)) {
                        dataPool.razas[nombre].origenes.push(origenArchivo);
                    }
                }
                break;
            case "Subraza":
                if (!dataPool.razas[dependencia]) {
                    dataPool.razas[dependencia] = { subrazas: [], origenes: [origenArchivo] };
                }
                if (!dataPool.razas[dependencia].subrazas.some(s => s.nombre === nombre)) {
                    dataPool.razas[dependencia].subrazas.push({ nombre: nombre, origen: origenArchivo });
                }
                break;
            case "Trasfondo":
                if (!dataPool.trasfondos.some(t => t.nombre === nombre)) {
                    const opcionesBonus = dependencia ? dependencia.split('-') : [];
                    dataPool.trasfondos.push({ nombre: nombre, origen: origenArchivo, opciones: opcionesBonus });
                }
                break;
        }
    }
    return seProcesaronDatosValidos;
}

// Extirpación limpia por procedencia (Soporta múltiples fuentes sin pisarse)
function eliminarDatosPorOrigen(nombreLibro) {
    for (const clase in dataPool.clases) {
        if (dataPool.clases[clase].origenes) {
            dataPool.clases[clase].origenes = dataPool.clases[clase].origenes.filter(o => o !== nombreLibro);
            if (dataPool.clases[clase].origenes.length === 0) {
                delete dataPool.clases[clase];
                continue;
            }
        } else if (dataPool.clases[clase].origen === nombreLibro) {
            delete dataPool.clases[clase];
            continue;
        }
        dataPool.clases[clase].subclases = dataPool.clases[clase].subclases.filter(s => s.origen !== nombreLibro);
    }
    
    for (const raza in dataPool.razas) {
        if (dataPool.razas[raza].origenes) {
            dataPool.razas[raza].origenes = dataPool.razas[raza].origenes.filter(o => o !== nombreLibro);
            if (dataPool.razas[raza].origenes.length === 0) {
                delete dataPool.razas[raza];
                continue;
            }
        } else if (dataPool.razas[raza].origen === nombreLibro) {
            delete dataPool.razas[raza];
            continue;
        }
        dataPool.razas[raza].subrazas = dataPool.razas[raza].subrazas.filter(s => s.origen !== nombreLibro);
    }
    
    dataPool.trasfondos = dataPool.trasfondos.filter(t => t.origen !== nombreLibro);
}

function actualizarListaVisual() {
    if (!loadedFilesList) return;
    if (librosCargadosNombres.length === 0) {
        loadedFilesList.innerHTML = `<span class="empty-list-msg">Ningún libro personalizado cargado todavía.</span>`;
        return;
    }
    loadedFilesList.innerHTML = librosCargadosNombres
        .map(nombre => `
            <div class="libro-chip">
                <span>📖 ${nombre}</span>
                <button type="button" class="btn-remove-chip" onclick="eliminarLibroIndividual('${nombre}')">×</button>
            </div>
        `).join('');
}

window.eliminarLibroIndividual = function(nombreLibro) {
    eliminarDatosPorOrigen(nombreLibro);
    librosCargadosNombres = librosCargadosNombres.filter(n => n !== nombreLibro);
    actualizarListaVisual();
    verificarBotones();
    mostrarNotificacion(`Se eliminó "${nombreLibro}".`, "success");
};

function verificarBotones() {
    if (!generateBtn) return;
    
    const totalClasesActivas = Object.keys(dataPool.clases).length;

    // VALIDACIÓN ATÓMICA: Si quedan clases vivas en el pool, el botón se habilita sí o sí.
    if (totalClasesActivas > 0) {
        generateBtn.disabled = false;
    } else {
        generateBtn.disabled = true;
    }
}

if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        dataPool = { clases: {}, razas: {}, trasfondos: [] };
        librosCargadosNombres = [];
        actualizarListaVisual();
        
        // Recorremos las llaves del objeto para apagar los elementos gráficos correctamente
        Object.keys(LIBROS_OFICIALES).forEach(nombreArchivo => {
            const el = document.getElementById(`chk-${nombreArchivo.replace('.', '-')}`);
            if (el) el.checked = false;
        });

        verificarBotones();
        mostrarNotificacion("Base de datos completamente vaciada.", "error");
        if (resultBox) resultBox.style.display = "none";
        const containerStats = document.getElementById('container-stats');
        if (containerStats) containerStats.style.display = "none";
    });
}

// =========================================================================
// 5. FUNCIÓN DE APOYO: GENERACIÓN, ASIGNACIÓN Y BONOS DE TRASFONDO
// =========================================================================
function generarStatsOptimizadas(claseNombre, trasfondoNombre) {
    const statsNombres = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    let statsFinales = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

    const traductorIds = {
        str: 'stat-fue', dex: 'stat-des', con: 'stat-con',
        int: 'stat-int', wis: 'stat-sab', cha: 'stat-car'
    };

    const traductorCsv = {
        str: 'Fuerza', dex: 'Destreza', con: 'Constitución',
        int: 'Inteligencia', wis: 'Sabiduría', cha: 'Carisma'
    };

    const dadosDados = [15, 14, 13, 12, 10, 8];
    const primarios = dataPool.clases[claseNombre]?.primarios || [];

    let prioridadAlta = [];
    let prioridadBaja = [];

    // --- FASE 1: REPARTO BASE (STANDARD ARRAY) ---
    statsNombres.forEach(stat => {
        const nombreEnEspañol = traductorCsv[stat];
        if (primarios.includes(nombreEnEspañol)) {
            prioridadAlta.push(stat);
        } else {
            prioridadBaja.push(stat);
        }
    });

    prioridadBaja.sort(() => Math.random() - 0.5);
    const ordenAsignacion = [...prioridadAlta, ...prioridadBaja];

    ordenAsignacion.forEach((stat, index) => {
        statsFinales[stat] = dadosDados[index];
    });

    // --- FASE 2: PREPARAR EL GIRO VISUAL ---
    const containerStats = document.getElementById('container-stats');
    if (containerStats) containerStats.style.display = "flex";

    statsNombres.forEach(stat => {
        const elementoHtml = document.getElementById(traductorIds[stat]);
        if (elementoHtml) {
            elementoHtml.classList.add('stat-rolling');
            const contenedorPadre = elementoHtml.parentElement;
            if (contenedorPadre) contenedorPadre.classList.remove('stat-boosted');
        }
    });

    const intervaloRoll = setInterval(() => {
        statsNombres.forEach(stat => {
            const elementoHtml = document.getElementById(traductorIds[stat]);
            if (elementoHtml) {
                elementoHtml.innerText = Math.floor(Math.random() * 16) + 3;
            }
        });
    }, 50);

    // --- FASE 3: DETENER GIRO Y CALCULAR SUMAS EN SIMULTÁNEO ---
    setTimeout(() => {
        clearInterval(intervaloRoll);

        const trasfondoObj = dataPool.trasfondos.find(t => t.nombre === trasfondoNombre);
        const opcionesBonus = trasfondoObj?.opciones || [];

        let atributosAptosConValor = [];
        statsNombres.forEach(stat => {
            const nombreEnEspañol = traductorCsv[stat];
            if (opcionesBonus.includes(nombreEnEspañol)) {
                atributosAptosConValor.push({
                    clave: stat,
                    valorBase: statsFinales[stat]
                    });
            }
        });

        atributosAptosConValor.sort((a, b) => b.valorBase - a.valorBase);

        let statConMasDos = null;
        let statConMasUno = null;

        if (atributosAptosConValor.length >= 1) {
            statConMasDos = atributosAptosConValor[0].clave;
            statsFinales[statConMasDos] += 2; 
        }
        if (atributosAptosConValor.length >= 2) {
            statConMasUno = atributosAptosConValor[1].clave;
            statsFinales[statConMasUno] += 1; 
        }

        // --- FASE 4: IMPRIMIR RESULTADOS FINALES ACTUALIZADOS ---
        statsNombres.forEach(stat => {
            const elementoHtml = document.getElementById(traductorIds[stat]);
            if (elementoHtml) {
                elementoHtml.classList.remove('stat-rolling');
                
                const valorFinal = statsFinales[stat];
                const mod = Math.floor((valorFinal - 10) / 2);
                const signoMod = mod >= 0 ? `+${mod}` : `${mod}`;

                elementoHtml.innerHTML = `${valorFinal} <span style="font-size: 0.85rem; color: var(--text-secondary); margin-left: 4px; display: inline;">(${signoMod})</span>`;

                if (stat === statConMasDos || stat === statConMasUno) {
                    const contenedorPadre = elementoHtml.parentElement;
                    if (contenedorPadre) {
                        contenedorPadre.classList.add('stat-boosted');
                    }
                }
            }
        });
    }, 500);
}

// =========================================================================
// 6. LÓGICA DEL RANDOMIZADOR CON SLOT MACHINE HOMOGÉNEO EN LAS 6 COLUMNAS
// =========================================================================
if (generateBtn) {
    generateBtn.addEventListener('click', () => {
        const levelSelect = document.getElementById('level-select');
        if (!levelSelect) return;
        
        const level = parseInt(levelSelect.value);
        const clasesDisponibles = Object.keys(dataPool.clases);
        
        if (clasesDisponibles.length === 0) {
            mostrarNotificacion("Error: Primero tenés que activar o cargar un libro válido.", "error");
            return; 
        }
        
        generateBtn.disabled = true;
        const textoOriginalBoton = generateBtn.innerText;
        generateBtn.innerText = "GENERANDO...";

        const claseRandom = getRandomElement(clasesDisponibles);
        let subclaseRandom = "No aplica (Nivel menor a 3)";
        const listaSubclases = dataPool.clases[claseRandom].subclases || [];
        
        if (level >= 3 && listaSubclases.length > 0) {
            subclaseRandom = getRandomElement(listaSubclases).nombre;
        }

        const razasDisponibles = Object.keys(dataPool.razas);
        const razaRandom = razasDisponibles.length > 0 ? getRandomElement(razasDisponibles) : "Desconocida";
        
        const subrazasDeRaza = dataPool.razas[razaRandom]?.subrazas || [];
        let subrazaRandom = "No aplica / Ninguna";
        if (subrazasDeRaza.length > 0) {
            subrazaRandom = getRandomElement(subrazasDeRaza).nombre;
        }

        const trasfondoRandom = dataPool.trasfondos.length > 0 ? getRandomElement(dataPool.trasfondos).nombre : "Ninguno";

        const palabrasFalsasClases = clasesDisponibles;
        const palabrasFalsasRazas = razasDisponibles.length > 0 ? razasDisponibles : ["Humano", "Elfo", "Enano", "Orco"];
        const palabrasFalsasTrasfondos = dataPool.trasfondos.length > 0 ? dataPool.trasfondos.map(t => t.nombre) : ["Acólito", "Criminal", "Héroe"];

        let todasLasSubclasesFalsas = [];
        for (const c in dataPool.clases) {
            dataPool.clases[c].subclases.forEach(s => todasLasSubclasesFalsas.push(s.nombre));
        }
        if (todasLasSubclasesFalsas.length === 0) todasLasSubclasesFalsas = ["Campeón", "Evocador", "Asesino"];

        let todasLasSubrazasFalsas = [];
        for (const r in dataPool.razas) {
            dataPool.razas[r].subrazas.forEach(s => todasLasSubrazasFalsas.push(s.nombre));
        }
        if (todasLasSubrazasFalsas.length === 0) todasLasSubrazasFalsas = ["Alto Elfo", "Enano Colina"];

        if (containerSubclass) containerSubclass.style.display = (level >= 3 && listaSubclases.length > 0) ? "block" : "none";
        if (containerSubrace) containerSubrace.style.display = (subrazasDeRaza.length > 0) ? "block" : "none";
        if (resultBox) resultBox.style.display = "grid";

        const txtLevel = document.getElementById('res-level');
        const txtRace = document.getElementById('res-race');
        const txtSubrace = document.getElementById('res-subrace');
        const txtClass = document.getElementById('res-class');
        const txtSubclass = document.getElementById('res-subclass');
        const txtBackground = document.getElementById('res-background');

        const textosHtml = [txtLevel, txtRace, txtSubrace, txtClass, txtSubclass, txtBackground];
        textosHtml.forEach(el => { if (el) el.classList.add('stat-rolling'); });

        const intervaloTextoRoll = setInterval(() => {
            if (txtLevel) txtLevel.innerText = Math.floor(Math.random() * 20) + 1;
            if (txtRace) txtRace.innerText = getRandomElement(palabrasFalsasRazas);
            if (txtSubrace) txtSubrace.innerText = getRandomElement(todasLasSubrazasFalsas);
            if (txtClass) txtClass.innerText = getRandomElement(palabrasFalsasClases);
            if (txtSubclass) txtSubclass.innerText = getRandomElement(todasLasSubclasesFalsas);
            if (txtBackground) txtBackground.innerText = getRandomElement(palabrasFalsasTrasfondos);
        }, 50);

        generarStatsOptimizadas(claseRandom, trasfondoRandom);

        setTimeout(() => {
                clearInterval(intervaloTextoRoll); 
                textosHtml.forEach(el => { if (el) el.classList.remove('stat-rolling'); });

                if (txtLevel) txtLevel.innerText = level;
                if (txtRace) txtRace.innerText = razaRandom;
                if (txtSubrace) txtSubrace.innerText = subrazaRandom;
                if (txtClass) txtClass.innerText = claseRandom;
                if (txtSubclass) txtSubclass.innerText = subclaseRandom;
                if (txtBackground) txtBackground.innerText = trasfondoRandom;

                if (containerSubclass) containerSubclass.style.display = (level >= 3 && listaSubclases.length > 0) ? "block" : "none";
                if (containerSubrace) containerSubrace.style.display = (subrazasDeRaza.length > 0) ? "block" : "none";

                generateBtn.disabled = false;
                generateBtn.innerText = textoOriginalBoton;

            }, 500);
    });
}

function getRandomElement(arr) {
    if (!arr || arr.length === 0) return "";
    return arr[Math.floor(Math.random() * arr.length)];
}