// =========================================================================
// 1. BASE DE DATOS GLOBAL Y ACUMULATIVA
// =========================================================================
let dataPool = { clases: {}, razas: {}, trasfondos: [] };
let librosCargadosNombres = []; 

// =========================================================================
// 2. REFERENCIAS AL DOM
// =========================================================================
const fileInput = document.getElementById('csv-file');
const generateBtn = document.getElementById('generate-btn');
const statusText = document.getElementById('status-text');
const loadedFilesList = document.getElementById('loaded-files-list');

// Elementos de visualización de resultados
const containerSubclass = document.getElementById('container-subclass');
const containerSubrace = document.getElementById('container-subrace');
const resultBox = document.getElementById('result-box');

// Botón de limpieza (opcional)
const clearBtn = document.getElementById('clear-btn'); 

// =========================================================================
// 3. EVENTOS DE CARGA DE ARCHIVOS
// =========================================================================
fileInput.addEventListener('change', function(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    let loaders = Array.from(files).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                appendCSVToPool(event.target.result);
                
                if (!librosCargadosNombres.includes(file.name)) {
                    librosCargadosNombres.push(file.name);
                }
                resolve();
            };
            reader.readAsText(file, 'UTF-8');
        });
    });

    Promise.all(loaders).then(() => {
        actualizarEstado();
        actualizarListaVisual(); 
        fileInput.value = ""; 
    });
});

// Parsear líneas del CSV e inyectar al Pool
function appendCSVToPool(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    for (let i = 1; i < lines.length; i++) {
        const [tipo, nombre, dependencia] = lines[i].split(',').map(item => item ? item.trim() : "");
        if (!tipo || !nombre) continue;

        switch (tipo) {
            case "Clase":
                if (!dataPool.clases[nombre]) {
                    // Si el CSV trae estadísticas (ej: "Fuerza-Constitución"), las mapeamos
                    const primarios = dependencia ? dependencia.split('-') : [];
                    dataPool.clases[nombre] = { subclases: [], primarios: primarios };
                }
                break;
            case "Subclase":
                if (!dataPool.clases[dependencia]) {
                    dataPool.clases[dependencia] = { subclases: [], primarios: [] };
                }
                if (!dataPool.clases[dependencia].subclases.includes(nombre)) {
                    dataPool.clases[dependencia].subclases.push(nombre);
                }
                break;
            case "Raza":
                if (!dataPool.razas[nombre]) dataPool.razas[nombre] = [];
                break;
            case "Subraza":
                if (!dataPool.razas[dependencia]) dataPool.razas[dependencia] = [];
                if (!dataPool.razas[dependencia].includes(nombre)) dataPool.razas[dependencia].push(nombre);
                break;
            case "Trasfondo":
                if (!dataPool.trasfondos.includes(nombre)) dataPool.trasfondos.push(nombre);
                break;
        }
    }
}

// =========================================================================
// 4. ACTUALIZACIÓN DE INTERFAZ (ESTADOS Y LISTAS)
// =========================================================================
function actualizarListaVisual() {
    if (!loadedFilesList) return;
    
    if (librosCargadosNombres.length === 0) {
        loadedFilesList.innerHTML = `<li class="empty-list-msg">Ningún libro cargado todavía.</li>`;
        return;
    }

    loadedFilesList.innerHTML = librosCargadosNombres
        .map(nombre => `<li>${nombre}</li>`)
        .join('');
}

function actualizarEstado() {
    const totalClases = Object.keys(dataPool.clases).length;
    const totalTrasfondos = dataPool.trasfondos.length;

    if (totalClases > 0 || totalTrasfondos > 0) {
        if (statusText) statusText.innerHTML = `<span style="color: #2ecc71; font-weight: bold;">✓ Base de datos actualizada con éxito.</span>`;
        generateBtn.disabled = false;
    } else {
        if (statusText) statusText.innerText = "Error: Datos no válidos.";
        generateBtn.disabled = true;
    }
}

// Lógica segura para el botón de limpiar
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        dataPool = { clases: {}, razas: {}, trasfondos: [] };
        librosCargadosNombres = [];
        generateBtn.disabled = true;
        actualizarListaVisual();
        if (statusText) statusText.innerText = "Base de datos vaciada. Por favor, carga archivos .csv";
        if (resultBox) resultBox.style.display = "none";
        
        const containerStats = document.getElementById('container-stats');
        if (containerStats) containerStats.style.display = "none";
    });
}

// =========================================================================
// 5. FUNCIÓN DE ASIGNACIÓN DE ESTADÍSTICAS OPTIMIZADAS
// =========================================================================
function generarStatsOptimizadas(claseNombre) {
    const atributos = ["Fuerza", "Destreza", "Constitución", "Inteligencia", "Sabiduría", "Carisma"];
    const standardArray = [15, 14, 13, 12, 10, 8];
    
    let resultadoStats = { "Fuerza": 0, "Destreza": 0, "Constitución": 0, "Inteligencia": 0, "Sabiduría": 0, "Carisma": 0 };
    
    const claseInfo = dataPool.clases[claseNombre];
    // Failsafe por si una clase vino vacía o sin dependencias en el CSV
    const primarios = (claseInfo && claseInfo.primarios.length > 0) ? claseInfo.primarios : ["Fuerza", "Constitución"];
    
    // 1. Asignamos los puntajes máximos (15 y 14) a las dos estadísticas core de la clase
    if (resultadoStats.hasOwnProperty(primarios[0])) {
        resultadoStats[primarios[0]] = standardArray.shift(); // Saca el 15
    }
    if (primarios[1] && resultadoStats.hasOwnProperty(primarios[1])) {
        resultadoStats[primarios[1]] = standardArray.shift(); // Saca el 14
    }
    
    // 2. Mezclamos el resto del Standard Array (13, 12, 10, 8) para que varíe el resto del build
    const restantesMezclados = standardArray.sort(() => Math.random() - 0.5);
    
    // 3. Repartimos los números mezclados en los atributos que quedaron en cero
    atributos.forEach(attr => {
        if (resultadoStats[attr] === 0) {
            resultadoStats[attr] = restantesMezclados.shift();
        }
    });
    
    // 4. Inyección controlada en los bloques de estadísticas del DOM
    if(document.getElementById('stat-fue')) document.getElementById('stat-fue').innerText = resultadoStats["Fuerza"];
    if(document.getElementById('stat-des')) document.getElementById('stat-des').innerText = resultadoStats["Destreza"];
    if(document.getElementById('stat-con')) document.getElementById('stat-con').innerText = resultadoStats["Constitución"];
    if(document.getElementById('stat-int')) document.getElementById('stat-int').innerText = resultadoStats["Inteligencia"];
    if(document.getElementById('stat-sab')) document.getElementById('stat-sab').innerText = resultadoStats["Sabiduría"];
    if(document.getElementById('stat-car')) document.getElementById('stat-car').innerText = resultadoStats["Carisma"];
    
    const containerStats = document.getElementById('container-stats');
    if (containerStats) containerStats.style.display = "flex";
}

// =========================================================================
// 6. LÓGICA DEL RANDOMIZADOR
// =========================================================================
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

generateBtn.addEventListener('click', () => {
    const levelSelect = document.getElementById('level-select');
    if (!levelSelect) return;
    
    const level = parseInt(levelSelect.value);
    
    // --- CLASE Y SUBCLASE ---
    const clasesDisponibles = Object.keys(dataPool.clases);
    if (clasesDisponibles.length === 0) return; 
    
    const claseRandom = getRandomElement(clasesDisponibles);
    let subclaseRandom = "No aplica (Nivel menor a 3)";
    
    const listaSubclases = dataPool.clases[claseRandom].subclases;
    
    if (level >= 3 && listaSubclases && listaSubclases.length > 0) {
        subclaseRandom = getRandomElement(listaSubclases);
        if (containerSubclass) containerSubclass.style.display = "block";
    } else {
        if (containerSubclass) containerSubclass.style.display = "none";
    }

    // --- RAZA Y SUBRAZA ---
    const razasDisponibles = Object.keys(dataPool.razas);
    const razaRandom = razasDisponibles.length > 0 ? getRandomElement(razasDisponibles) : "Desconocida";
    const subrazasDeRaza = dataPool.razas[razaRandom] || [];
    let subrazaRandom = "";

    if (subrazasDeRaza.length > 0) {
        subrazaRandom = getRandomElement(subrazasDeRaza);
        if (containerSubrace) containerSubrace.style.display = "block";
    } else {
        if (containerSubrace) containerSubrace.style.display = "none";
    }

    // --- TRASFONDO ---
    const trasfondoRandom = dataPool.trasfondos.length > 0 ? getRandomElement(dataPool.trasfondos) : "Ninguno";

    // --- INYECCIÓN EN EL DOM ---
    document.getElementById('res-level').innerText = level;
    document.getElementById('res-class').innerText = claseRandom;
    document.getElementById('res-subclass').innerText = subclaseRandom;
    document.getElementById('res-race').innerText = razaRandom;
    document.getElementById('res-subrace').innerText = subrazaRandom;
    document.getElementById('res-background').innerText = trasfondoRandom;

    // --- GENERAR CARACTERÍSTICAS SEMI-OPTIMIZADAS ---
    generarStatsOptimizadas(claseRandom);

    if (resultBox) resultBox.style.display = "grid";
});