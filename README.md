# 🎲 D&D 2024 Character Randomizer

¡Bienvenido al **D&D 2024 Character Randomizer**! Esta es una herramienta web interactiva, responsiva y con una estética *dark premium* diseñada para Dungeon Masters y jugadores que necesitan generar conceptos de personajes listos para la mesa en cuestión de segundos. 

La principal ventaja de este sistema es que es **100% dinámico y desacoplado**: no contiene datos estáticos en el código (*hardcoded*), sino que procesa, mapea y acumula la información en caliente desde archivos `.csv` externos.

---

## 🚀 Funcionalidades Clave y Mecánicas del Sistema

La aplicación va mucho más allá de un sorteo aleatorio simple; procesa la información de forma inteligente a través de los siguientes módulos:

1. **Carga Asíncrona Múltiple (FileReader + Promesas):** Hacés click en `📂 Cargar Libros (.csv)` y podés seleccionar varios suplementos en simultáneo. El script procesa todo en paralelo usando `Promise.all()`.
2. **Gestión de Base de Datos Dinámica (Data Management):** El sistema etiqueta el contenido con su archivo de origen. Al cargarse, se generan **chips interactivos en la interfaz** que te permiten extirpar un libro específico de la memoria con un solo click sin necesidad de reiniciar la aplicación.
3. **Efecto Ruleta Estilo Casino (Visual Slot Machine):** Al generar un personaje, todas las columnas de texto (Clase, Raza, Trasfondo) y los 6 casilleros de estadísticas entran en un bucle asíncrono de alta velocidad (`setInterval`), simulando un giro de casino que frena homogéneamente a los 500ms con los datos definitivos.
4. **Algoritmo de Optimización de Atributos (*Standard Array*):** El sistema toma el bloque de dotes oficiales [15, 14, 13, 12, 10, 8] y lo reparte de forma inteligente. Detecta cuáles son las estadísticas principales de la clase sorteada y les asigna los valores más altos, distribuyendo el resto de forma aleatoria para garantizar un personaje mecánicamente viable.
5. **Inyección de Bonos por Trasfondo (Suma Automática):** El script lee la dote o dependencia del trasfondo (ej. Fuerza-Constitución-Carisma), detecta cuáles son las dos estadísticas más altas que tiene el personaje dentro de esas opciones y les aplica automáticamente un **+2** y un **+1** respectivamente, iluminando el casillero con un degradado premium (`.stat-boosted`) y recalculando el modificador de dote en tiempo real.
6. **Filtro de Progresión de Nivel:** Si el personaje es nivel 1 o 2, la interfaz oculta dinámicamente la sección de subclase. Si es nivel 3 o superior, abre la sección y sortea una subclase que pertenezca estrictamente a la clase obtenida.

---

## 📂 Estructura de la Base de Datos (`DB/`)

El proyecto cuenta con una carpeta llamada `DB/` donde se almacenan los archivos de datos oficiales separados por libros. Actualmente, el repositorio incluye los siguientes archivos listos para usar:

* **`dnd_2024_phb_elementos.csv` (Player's Handbook 2024):** Contiene todas las clases base oficiales, subclases core, razas, subrazas y los nuevos trasfondos del manual esencial de la edición 2024.
* **`dnd_2024_eberron_oficial.csv` (Eberron: Forge of the Artificer):** Añade el contenido temático del escenario de campaña de Eberron, incluyendo al Artificiero con sus subclases, razas nativas (Forjado, Kalashtar, etc.) y trasfondos de las Casas de la Marca del Dragón mapeados con sus respectivas dependencias de atributos.

### 🔮 Escalabilidad del CSV
Si querés expandir tu base de datos con nuevos suplementos oficiales o homebrews personalizados, solo tenés que crear un archivo `.csv` que respete rigurosamente esta estructura de cabecera y dependencias:

'''csv
Tipo,Nombre,Dependencia
Clase,Artificiero,Inteligencia-Constitución
Subclase,Alquimista,Artificiero
Raza,Forjado,
Trasfondo,Heredero de la Casa Cannith,Fuerza-Destreza-Inteligencia
Inquisitivo,Constitución-Inteligencia-Carisma
'''

*Nota sobre Trasfondos:* Al separar los atributos con guiones (`-`) en la columna de dependencia, el motor de JavaScript los parseará automáticamente como aptos para recibir los incrementos de dote (+2/+1).

---

## 🛠️ Tecnologías Utilizadas

* **HTML5:** Estructura limpia, semántica y accesible para los contenedores de datos.
* **CSS3 Moderno:** Diseño completamente responsivo basado en CSS Flexbox/Grid, uso estricto de variables personalizadas para la gestión del *Dark Mode*, animaciones de parpadeo (`@keyframes`) para el estado de giro y clases dinámicas de resaltado.
* **JavaScript Vanilla (ES6+):** File API, lectores de flujo asíncronos (`FileReader`), control de temporizadores (`setInterval` / `setTimeout`), algoritmos avanzados de ordenamiento por prioridad (`.sort()`) y manipulación quirúrgica del DOM sin dependencias externas.

---

# ✒️ Autor
* **Coty_20** - [Coty1904](https://github.com/Coty1904)
