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
                if (!dataPool.clases[nombre]) dataPool.clases[nombre] = [];
                break;
            case "Subclase":
                if (!dataPool.clases[dependencia]) dataPool.clases[dependencia] = [];
                if (!dataPool.clases[dependencia].includes(nombre)) dataPool.clases[dependencia].push(nombre);
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

// Lógica segura para el botón de limpiar (Solo ejecuta si el ID existe en tu HTML)
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        dataPool = { clases: {}, razas: {}, trasfondos: [] };
        librosCargadosNombres = [];
        generateBtn.disabled = true;
        actualizarListaVisual();
        if (statusText) statusText.innerText = "Base de datos vaciada. Por favor, carga archivos .csv";
        if (resultBox) resultBox.style.display = "none";
    });
}

// =========================================================================
// 5. LÓGICA DEL RANDOMIZADOR
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
    
    if (level >= 3 && dataPool.clases[claseRandom] && dataPool.clases[claseRandom].length > 0) {
        subclaseRandom = getRandomElement(dataPool.clases[claseRandom]);
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

    if (resultBox) resultBox.style.display = "flex";
});