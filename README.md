# Aniimaster (Aniimax ES) — Optimizador de Base, Calculadora de Tierra Natal y Recomendador de Aniimos

[![Probar Online](https://img.shields.io/badge/Demo%20Online-oscarlosu--lab.github.io-00f0ff?style=for-the-badge&logo=githubpages&logoColor=white)](https://oscarlosu-lab.github.io/aniimax-es/)
[![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-22c55e.svg?style=for-the-badge)](LICENSE)
[![Versión 2.2 Pro](https://img.shields.io/badge/Versi%C3%B3n-2.2%20Pro-a855f7.svg?style=for-the-badge)]()
[![Español 100%](https://img.shields.io/badge/Idioma-Espa%C3%B1ol%20%7C%20Biling%C3%BCe-f97316.svg?style=for-the-badge)]()
[![Datamine Oficial](https://img.shields.io/badge/Datamine-Aniimo%20v1.0-3b82f6.svg?style=for-the-badge)]()

> 🚀 **[¡HAZ CLIC AQUÍ PARA ACCEDER A LA CALCULADORA WEB EN DIRECTO!](https://oscarlosu-lab.github.io/aniimax-es/)**  
> *Herramienta web gratuita, responsive para móviles y PC, sin descargas, sin publicidad y ejecutada 100% en tu navegador (PWA).*

---

## 📖 Tabla de Contenidos

1. [¿Qué es Aniimaster (Aniimax ES)?](#-qué-es-aniimaster-aniimax-es)
2. [El Algoritmo de Personalidades MBTI (+20% Velocidad)](#-el-algoritmo-de-personalidades-mbti-20-velocidad)
3. [Tabla Completa: Instalaciones vs Personalidad Requerida](#-tabla-completa-instalaciones-vs-personalidad-requerida)
4. [Recomendador Inteligente de Aniimos y Alternativas Salvajes](#-recomendador-inteligente-de-aniimos-y-alternativas-salvajes)
5. [Plano de Base con Múltiples Unidades de Almacenamiento (UA)](#-plano-de-base-con-múltiples-unidades-de-almacenamiento-ua)
6. [Monitor de Nutrición y Autonomía AFK](#-monitor-de-nutrición-y-autonomía-afk)
7. [Preguntas Frecuentes (FAQ / Guía Rápida)](#-preguntas-frecuentes-faq--guía-rápida)
8. [Cómo Ejecutar en Local y Compilación](#-cómo-ejecutar-en-local-y-compilación)
9. [Créditos y Reconocimientos](#-créditos-y-reconocimientos)

---

## 🎯 ¿Qué es Aniimaster (Aniimax ES)?

**Aniimaster** es la herramienta definitiva de **planificación y optimización matemática para el Hogar / Tierra Natal en Aniimo**. Mediante un motor de **Programación Lineal Entera Mixta (MIP)** implementado en **Rust y WebAssembly (HiGHS)**, calcula con exactitud matemática:

* 💰 **Ruta más rápida para generar Monedas del Hogar:** Maximiza tus ingresos horarios de monedas vendiendo las recetas más rentables según tus instalaciones disponibles.
* 🚐 **Ruta óptima para subir de nivel tu Casa Rodante (RV):** Desglosa los materiales exactos que necesitas reunir y el tiempo mínimo para alcanzar tu siguiente nivel de RV.
* 🐾 **Asignación óptima de Aniimos:** Selecciona automáticamente qué criaturas colocar en cada puesto de trabajo, considerando niveles de aptitud (Lv.1 a Lv.4), labores de campo, transporte continuo con `Remolque` y las **bonificaciones de personalidad (+20% velocidad)**.
* 📦 **Diseño espacial inteligente:** Distribuye las parcelas, talleres y almacenes para minimizar los trayectos de acarreo y evitar atascos.

---

## 🧬 El Algoritmo de Personalidades MBTI (+20% Velocidad)

En *Aniimo*, cada criatura capturada o eclosionada posee una **Personalidad** estructurada en torno a **4 ejes dicotómicos inspirados en el modelo MBTI**, dando lugar a 16 combinaciones posibles:

| Eje MBTI | Letras | Personalidades en Español | Enfoque de Rendimiento |
| :---: | :---: | :--- | :--- |
| **Eje 1** | **I / E** | **Instintivo** (*Instinctive*) / **Enérgico** (*Energetic*) | Reflejos inmediatos vs Vigor físico y resistencia |
| **Eje 2** | **N / S** | **Ágil** (*Nimble*) / **Práctico** (*Practical*) | Aceleración en labores vs Cero desperdicio de materiales |
| **Eje 3** | **F / T** | **Fiel** (*Faithful*) / **Tenaz** (*Tenacious*) | Constancia incondicional vs Resistencia a la fatiga y estrés |
| **Eje 4** | **P / J** | **Juguetón** (*Playful*) / **Sensato** (*Judicious*) | Creatividad e ingenio vs Pulcritud y máxima precisión artesanal |

### ¿Cómo funciona la Bonificación del +20% en el Hogar?
Cada estación de trabajo y edificio de residencia en la Tierra Natal tiene una **personalidad predilecta**. Si el Aniimo asignado posee esa personalidad, **su velocidad de producción o recolección aumenta automáticamente un +20%**.

### Regla de Oro: Conflicto de Personalidades Opuestas
Un mismo espécimen de Aniimo **no puede tener a la vez dos personalidades del mismo eje** (por ejemplo, no puede ser *Ágil (N)* y *Práctico (S)* simultáneamente).  
Nuestro algoritmo de recomendación analiza todas las instalaciones asignadas a cada criatura y:
1. **Fija los rasgos que activan el bono +20%** en sus puestos principales.
2. **Detecta y advierte sobre posibles conflictos** si se asignan dos puestos con requisitos opuestos, sugiriendo qué labor priorizar.
3. **Genera el Perfil MBTI Ideal de 4 Letras (ej. `E·N·T·J`)** para que sepas exactamente qué combinación buscar al eclosionar huevos en la guardería o al usar la **Fruta de Personalidad**.

---

## 📊 Tabla Completa: Instalaciones vs Personalidad Requerida

Esta es la matriz de compatibilidad de personalidades extraída directamente del datamine oficial:

| Instalación del Hogar | Nombre en Inglés | Aptitud Requerida | Personalidad Óptima | Letra | Bono de Velocidad |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Cocina abrasadora** | *Blazing Stove* | Fuego | **Ágil** (*Nimble*) | `N` | **+20%** |
| **Horno de chimenea** | *Chimney Kiln* | Fuego | **Práctico** (*Practical*) | `S` | **+20%** |
| **Olla a fuego lento** | *Simmering Pot* | Fuego | **Tenaz** (*Tenacious*) | `T` | **+20%** |
| **Cocina de garra** | *Claw Game Cooker* | Fuego | **Práctico** (*Practical*) | `S` | **+20%** |
| **Pozo** | *Well* | Agua | **Fiel** (*Faithful*) | `F` | **+20%** |
| **Barril saltarín** | *Bouncy Brew Keg* | Agua | **Enérgico** (*Energetic*) | `E` | **+20%** |
| **Mina** | *Mine* | Tierra | **Juguetón** (*Playful*) | `P` | **+20%** |
| **Mesa de artesanía** | *Crafting Table* | Artesanía | **Sensato** (*Judicious*) | `J` | **+20%** |
| **Banco de carpintería** | *Woodworking Bench* | Artesanía | **Enérgico** (*Energetic*) | `E` | **+20%** |
| **Molino de carrusel** | *Carousel Mill* | Viento | **Tenaz** (*Tenacious*) | `T` | **+20%** |
| **Telar de rueda** | *Joy Wheel Loom* | Viento | **Fiel** (*Faithful*) | `F` | **+20%** |
| **Secadora musical** | *Jukebox Dryer* | Oscuro | **Ágil** (*Nimble*) | `N` | **+20%** |
| **Frasco de encurtidos** | *Pickling Jar* | Oscuro | **Juguetón** (*Playful*) | `P` | **+20%** |
| **Mesa fonolfativa** | *Phonolfactory Table* | Perfumería | **Instintivo** (*Instinctive*) | `I` | **+20%** |
| **Molino floral** | *Floral Windmill* | Ocio | **Ágil** (*Nimble*) | `N` | **+20%** |
| **Casa del rocío** | *Dewy House* | Ocio | **Instintivo** (*Instinctive*) | `I` | **+20%** |
| **Castillo de arena susurrante** | *Tidewhisper Sandcastle* | Ocio | **Sensato** (*Judicious*) | `J` | **+20%** |
| **Cama nimbus** | *Nimbus Bed* | Ocio | **Sensato** (*Judicious*) | `J` | **+20%** |
| **Hamaca de estrellas** | *Starfall Hammock* | Ocio | **Fiel** (*Faithful*) | `F` | **+20%** |

---

## 🐾 Recomendador Inteligente de Aniimos y Alternativas Salvajes

Muchos jugadores no tienen todas las criaturas del juego o desconocen cuáles se pueden atrapar en el mapa libre:

* 🌿 **Detección de Aniimos Salvajes vs No Salvajes:** El recomendador identifica si una criatura es salvaje o si proviene exclusivamente de evolución, eclosión de huevos o eventos especiales.
* 🔄 **Botón de Alternativa Inmediata:** Si una sugerencia óptima requiere un Aniimo que aún no has evolucionado (por ejemplo, *Inferlupa*), el sistema te presenta una criatura salvaje alternativa con la misma aptitud y su **ubicación exacta en el mapa**, permitiéndote hacer el reemplazo con un solo clic.
* 📦 **Transportistas Garantizados:** El sistema reserva automáticamente plazas para Aniimos con alto nivel de `Remolque` para mantener los almacenes abastecidos sin parones de producción.

---

## 🏗️ Plano de Base con Múltiples Unidades de Almacenamiento (UA)

A partir de los niveles intermedios de Casa Rodante (RV 10+), el juego desbloquea **múltiples almacenes**:

* El algoritmo de colocación espacial agrupa los procesadores y parcelas alrededor del **almacén más cercano**.
* Esto reduce la distancia media recorrida por tus criaturas transportistas en más de un **40%**, traduciéndose en una tasa efectiva de monedas superior.

---

## 🍎 Monitor de Nutrición y Autonomía AFK

* **Calculadora de Gasto Calórico:** Calcula el consumo exacto de energía por minuto de todas las criaturas trabajando en el plan.
* **Autonomía del Comedero:** Selecciona el plato de comida que utilizas (ej. Guiso de bayas, Ensalada de ginseng, etc.) y la herramienta calculará **cuántos días y horas reales durará el comedero lleno (1.000 raciones)** antes de que tus Aniimos empiecen a pasar hambre o perder ánimo.

---

## ❓ Preguntas Frecuentes (FAQ / Guía Rápida)

### ¿Cómo subo de nivel la Casa Rodante (RV) lo más rápido posible?
En la pestaña de **Estrategia**, selecciona *"Subir de nivel"* e introduce tus existencias actuales de materiales. El solucionador de programación lineal calculará la combinación exacta de recetas que minimiza el tiempo total hasta alcanzar los requisitos del siguiente nivel.

### ¿Cómo cambio la personalidad de un Aniimo en el juego?
La personalidad se asigna aleatoriamente al capturar o eclosionar una criatura. Si necesitas el rasgo óptimo para una instalación, puedes volver a tirar la personalidad de un Aniimo utilizando una **Fruta de Personalidad** (*Personality Fruit*), o criando huevos en la guardería hasta obtener las letras deseadas.

### ¿Se guardan mis configuraciones?
Sí. Todas tus selecciones de nivel de RV, instalaciones y personalizaciones de equipo se guardan automáticamente en el almacenamiento local (`localStorage`) de tu propio navegador. No necesitas crearte una cuenta ni iniciar sesión.

---

## 💻 Cómo Ejecutar en Local y Compilación

Si deseas ejecutar o contribuir al desarrollo de la herramienta en tu ordenador:

### 1. Clonar el repositorio
```bash
git clone https://github.com/oscarlosu-lab/aniimax-es.git
cd aniimax-es
```

### 2. Iniciar un servidor web local
```bash
# Con Python 3:
python -m http.server 8080 --directory web

# O con Node.js / npx:
npx serve web
```
Abre en tu navegador favorito: `http://localhost:8080`

### 3. Recompilar WebAssembly (opcional, requiere Rust y wasm-pack)
```bash
wasm-pack build --target web --out-dir web/pkg
```

---

## 🤝 Créditos y Reconocimientos

* **Herramienta original y motor matemático:** Creado por [**@ae-bii**](https://github.com/ae-bii) en el proyecto [**Aniimax**](https://github.com/ae-bii/aniimax). Nuestro más sincero agradecimiento a su creador por el modelado en Rust y el solver HiGHS.
* **Edición en Español, Recomendador v2.2 y Optimización de Personalidades:** Desarrollado y mantenido por [**@oscarlosu-lab**](https://github.com/oscarlosu-lab).
* **Datos del juego:** Extraídos mediante datamine e ingeniería inversa del cliente oficial de *Aniimo* (NetEase).

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT** de código abierto. Consulta el archivo [LICENSE](LICENSE) para más información.
