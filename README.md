# 🎲 D&D 2024 Character Randomizer

¡Bienvenido al **D&D 2024 Character Randomizer**! Esta es una herramienta web responsiva y con estilo *dark* diseñada para Dungeon Masters y jugadores que necesitan generar conceptos de personajes aleatorios de forma instantánea. 

La principal ventaja de este sistema es que es **100% dinámico**: no tiene datos estáticos en el código, sino que procesa y acumula la información directamente desde archivos `.csv` externos que representan los distintos libros de rol.

---

## 🚀 Cómo funciona la página

El funcionamiento es muy simple e intuitivo:

1. **Carga de Libros:** Hacés click en el botón dashed `📂 Cargar Libros (.csv)`. Podés seleccionar uno o varios archivos `.csv` al mismo tiempo.
2. **Pool Acumulativo:** El script de JavaScript lee los archivos en segundo plano, extrae las opciones (evitando duplicados) y te muestra abajo de forma visual qué libros tenés activos en la memoria.
3. **Selección de Nivel:** Elegís el nivel del personaje (del 1 al 20) mediante el menú desplegable.
4. **Generación Aleatoria:** Al presionar `Generar Personaje`, el sistema sortea los componentes. 
   * *Lógica de Subclases:* Si el personaje es nivel 1 o 2, la interfaz oculta la sección de subclase. Si es nivel 3 o superior, sortea automáticamente una subclase que pertenezca estrictamente a la clase seleccionada.

---

## 📂 Estructura de la Base de Datos (`DB/`)

El proyecto cuenta con una carpeta llamada `DB/` donde se almacenan los archivos de datos oficiales separados por libros. Actualmente, el repositorio incluye **2 libros listos para usar**:

* **`dnd_2024_phb_elementos.csv` (Player's Handbook 2024):** Contiene todas las clases base oficiales, subclases core, razas, subrazas y los nuevos trasfondos del manual esencial de la edición 2024.
* **`dnd_2024_eberron_oficial.csv` (Eberron: Forge of the Artificer):** Añade el contenido temático del escenario de campaña de Eberron, incluyendo sus dotes, trasfondos mecánicos y opciones específicas del artífice.

### 🔮 Escalabilidad a futuro
Si en el futuro querés expandir tu base de datos con nuevos suplementos oficiales (como *Xanathar*, *Tasha*) o con tus propias campañas personalizadas, solo tenés que crear un nuevo archivo `.csv` en la carpeta `DB/` que respete esta estructura de cabecera:

```csv
Tipo,Nombre,Dependencia
Clase,Mago,
Subclase,Escuela de Evocación,Mago
Raza,Elfo,
Subraza,Alto Elfo,Elfo
Trasfondo,Acólito,
```
## 🛠️ Tecnologías utilizadas
HTML5: Estructura limpia y semántica.

CSS3: Estructura responsiva basada en CSS Flexbox, variables personalizadas y estética oscura con acentos rojos.

JavaScript Moderno (Vanilla JS): File API, Promesas (Promise.all) para carga múltiple asíncrona y manipulación dinámica del DOM.

# ✒️ Autor
Coty_20 - Coty1904
