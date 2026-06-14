// =========================================================================
// 1. BASE DE DATOS GLOBAL, ACUMULATIVA Y ETIQUETADA
// =========================================================================
let dataPool = { clases: {}, razas: {}, trasfondos: [] };
let librosCargadosNombres = []; 

// =========================================================================
// 2. REFERENCIAS AL DOM
// =========================================================================
const fileInput = document.getElementById('csv-file');
const generateBtn = document.getElementById('generate-btn');
const loadedFilesList = document.getElementById('loaded-files-list');
const toastContainer = document.getElementById('toast-container');

// Elementos de resultados
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
    
    // Lo removemos del DOM automáticamente cuando termina su animación de salida
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// =========================================================================
// 3. EVENTOS DE CARGA DE ARCHIVOS (CON TOAST INTEGRADO)
// =========================================================================
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
                
                // Procesamos el archivo pasándole su propio nombre como etiqueta de origen
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
        // Renderizar interfaz renovada con Chips
        actualizarListaVisual(); 
        verificarBotones();

        // Disparar las alertas flotantes (Toasts) individuales
        if (archivosFallidos.length > 0) {
            archivosFallidos.forEach(nombre => {
                mostrarNotificacion(`Advertencia: ¡El libro "${nombre}" no tiene el formato adecuado para poder generar personajes!`, "error");
            });
        } else if (archivosExitososEnEstaTanda.length > 0) {
            mostrarNotificacion("Base de datos actualizada con éxito.", "success");
        }

        fileInput.value = ""; 
    });
});

// Parsear líneas e inyectar al Pool guardando el "origen" para poder borrarlo individualmente
function appendCSVToPool(text, origenArchivo) {
    if (!text || text.trim() === "") return false;

    const lines = text.split(/\r?\n|\r/).filter(line => line.trim() !== "");
    if (lines.length <= 1) return false;

    if (!lines[1] || !lines[1].includes(',')) return false; 

    let seProcesaronDatosValidos = false;
    const tiposValidos = ["Clase", "Subclase", "Raza", "Subraza", "Trasfondo"];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;

        const columnas = lines[i].split(',');
        const tipo = columnas[0] ? columnas[0].trim() : "";
        const nombre = columnas[1] ? columnas[1].trim() : "";
        const dependencia = columnas[2] ? columnas[2].trim() : "";

        if (!tiposValidos.includes(tipo)) continue;
        seProcesaronDatosValidos = true;

        switch (tipo) {
            case "Clase":
                if (!dataPool.clases[nombre]) {
                    const primarios = dependencia ? dependencia.split('-') : [];
                    dataPool.clases[nombre] = { subclases: [], primarios: primarios, origen: origenArchivo };
                }
                break;
            case "Subclase":
                if (!dataPool.clases[dependencia]) {
                    dataPool.clases[dependencia] = { subclases: [], primarios: [], origen: origenArchivo };
                }
                // Guardamos la subclase como objeto para retener su origen
                if (!dataPool.clases[dependencia].subclases.some(s => s.nombre === nombre)) {
                    dataPool.clases[dependencia].subclases.push({ nombre: nombre, origen: origenArchivo });
                }
                break;
            case "Raza":
                if (!dataPool.razas[nombre]) {
                    dataPool.razas[nombre] = { subrazas: [], origen: origenArchivo };
                }
                break;
            case "Subraza":
                if (!dataPool.razas[dependencia]) {
                    dataPool.razas[dependencia] = { subrazas: [], origen: origenArchivo };
                }
                if (!dataPool.razas[dependencia].subrazas.some(s => s.nombre === nombre)) {
                    dataPool.razas[dependencia].subrazas.push({ nombre: nombre, origen: origenArchivo });
                }
                break;
            case "Trasfondo":
                if (!dataPool.trasfondos.some(t => t.nombre === nombre)) {
                    // SEPARACIÓN CLAVE: Mapeamos los atributos del CSV (ej: Fuerza-Constitución)
                    const opcionesBonus = dependencia ? dependencia.split('-') : [];
                    dataPool.trasfondos.push({ 
                        nombre: nombre, 
                        origen: origenArchivo, 
                        opciones: opcionesBonus 
                    });
                }
                break;
        }
    }
    return seProcesaronDatosValidos;
}

// =========================================================================
// 4. NUEVA LÓGICA DE INTERFAZ: RENDERIZADO DE CHIPS Y BORRADO SELECCIONAL
// =========================================================================
function actualizarListaVisual() {
    if (!loadedFilesList) return;
    
    if (librosCargadosNombres.length === 0) {
        loadedFilesList.innerHTML = `<span class="empty-list-msg">Ningún libro cargado todavía.</span>`;
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

// FUNCIÓN CLAVE: Filtrar y extirpar los datos pertenecientes al libro eliminado
window.eliminarLibroIndividual = function(nombreLibro) {
    // 1. Remover de las clases
    for (const clase in dataPool.clases) {
        if (dataPool.clases[clase].origen === nombreLibro) {
            delete dataPool.clases[clase];
        } else {
            // Si la clase se queda, limpiamos solo sus subclases que vengan de ese archivo roto
            dataPool.clases[clase].subclases = dataPool.clases[clase].subclases.filter(s => s.origen !== nombreLibro);
        }
    }

    // 2. Remover de las razas
    for (const raza in dataPool.razas) {
        if (dataPool.razas[raza].origen === nombreLibro) {
            delete dataPool.razas[raza];
        } else {
            dataPool.razas[raza].subrazas = dataPool.razas[raza].subrazas.filter(s => s.origen !== nombreLibro);
        }
    }

    // 3. Remover de los trasfondos
    dataPool.trasfondos = dataPool.trasfondos.filter(t => t.origen !== nombreLibro);

    // 4. Remover del índice global de nombres
    librosCargadosNombres = librosCargadosNombres.filter(n => n !== nombreLibro);

    // Actualizar pantalla y lanzar aviso
    actualizarListaVisual();
    verificarBotones();
    mostrarNotificacion(`Se eliminó "${nombreLibro}" de la base de datos.`, "success");
};

function verificarBotones() {
    const totalClasesActivas = Object.keys(dataPool.clases).length;
    const totalTrasfondosActivos = dataPool.trasfondos.length;
    generateBtn.disabled = !(totalClasesActivas > 0 || totalTrasfondosActivos > 0);
}

// Lógica para el botón de limpiar todo
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        dataPool = { clases: {}, razas: {}, trasfondos: [] };
        librosCargadosNombres = [];
        actualizarListaVisual();
        verificarBotones();
        mostrarNotificacion("Base de datos completamente vaciada.", "error");
        if (resultBox) resultBox.style.display = "none";
        const containerStats = document.getElementById('container-stats');
        if (containerStats) containerStats.style.display = "none";
    });
}

// =========================================================================
// 5. FUNCIÓN DE APOYO: GENERACIÓN, ASIGNACIÓN Y BONOS DE TRASFONDO (CORREGIDO)
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

    // Arranca la animación del casino
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
        clearInterval(intervaloRoll); // Matamos el bucle loco

        // Buscamos el trasfondo adentro del timeout para evitar desajustes
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

        // Ordenamos las opciones de mayor a menor para meter los bonus de forma inteligente
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

                // Inyectamos el número final sumado y su modificador
                elementoHtml.innerHTML = `${valorFinal} <span style="font-size: 0.85rem; color: var(--text-secondary); margin-left: 4px; display: inline;">(${signoMod})</span>`;

                // CORRECCIÓN: Quitamos la variable fantasma "statenConMasUno" para que no explote
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
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

generateBtn.addEventListener('click', () => {
    const levelSelect = document.getElementById('level-select');
    if (!levelSelect) return;
    
    const level = parseInt(levelSelect.value);
    const clasesDisponibles = Object.keys(dataPool.clases);
    
    if (clasesDisponibles.length === 0) {
        mostrarNotificacion("Error: Primero tenés que cargar un libro válido.", "error");
        return; 
    }
    
    // --- 1. REALIZAR LOS SORTEOS REALES TRAS BAMBALINAS ---
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

    // --- 2. PREPARAR POOLS DE PALABRAS PARA EL EFECTO CASINO ---
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

    // --- 3. CONFIGURAR LA INTERFAZ PARA EL GIRO ---
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

    // --- 4. DISPARAR INTERVALO DE TEXTO DE CASINO (Cada 50ms) ---
    const intervaloTextoRoll = setInterval(() => {
        if (txtLevel) txtLevel.innerText = Math.floor(Math.random() * 20) + 1;
        if (txtRace) txtRace.innerText = getRandomElement(palabrasFalsasRazas);
        if (txtSubrace) txtSubrace.innerText = getRandomElement(todasLasSubrazasFalsas);
        if (txtClass) txtClass.innerText = getRandomElement(palabrasFalsasClases);
        if (txtSubclass) txtSubclass.innerText = getRandomElement(todasLasSubclasesFalsas);
        if (txtBackground) txtBackground.innerText = getRandomElement(palabrasFalsasTrasfondos);
    }, 50);

    // CORRECCIÓN CLAVE: Pasamos la clase sorteada Y el trasfondo sorteado para que calcule los bonus reales
    generarStatsOptimizadas(claseRandom, trasfondoRandom);

    // --- 5. FRENADO GENERAL A LOS 500MS ---
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

    }, 500);
});