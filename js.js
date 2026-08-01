// Importación de módulos de Firebase desde CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDoEyFWxbptyVkhe3RE367f7WnsVHDgIEU",
  authDomain: "wepropa.firebaseapp.com",
  projectId: "wepropa",
  storageBucket: "wepropa.firebasestorage.app",
  messagingSenderId: "227166484889",
  appId: "1:227166484889:web:c0e57c976b3c4615bdfb08",
  measurementId: "G-8BX8JDK5Q1"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables de Estado Local
let carrito = [];
let esAdmin = false;
let productosLista = [];

// Elementos del DOM
const cartTotalHeader = document.getElementById('cart-total');
const modalCartTotal = document.getElementById('modal-cart-total');
const modalCarrito = document.getElementById('modal-carrito');
const btnCarritoHeader = document.getElementById('btn-carrito');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const containerItems = document.getElementById('cart-items-container');
const btnContactar = document.getElementById('btn-contactar');

// Elementos Admin
const tituloPrincipal = document.getElementById('titulo-principal');
const modalLogin = document.getElementById('modal-login');
const btnCerrarLogin = document.getElementById('btn-cerrar-login');
const formLogin = document.getElementById('form-login');
const adminBar = document.getElementById('admin-bar');
const btnLogout = document.getElementById('btn-logout');

const modalAddProduct = document.getElementById('modal-add-product');
const btnOpenAddModal = document.getElementById('btn-open-add-modal');
const btnCerrarAdd = document.getElementById('btn-cerrar-add');
const formAddProduct = document.getElementById('form-add-product');
const productGrid = document.getElementById('product-grid');

// ==========================================
// 1. ESCUCHAR PRODUCTOS EN TIEMPO REAL (Firestore)
// ==========================================
onSnapshot(collection(db, "productos"), (snapshot) => {
    productosLista = [];
    snapshot.forEach(docSnap => {
        productosLista.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderizarProductos(productosLista);
});

function renderizarProductos(productos) {
    productGrid.innerHTML = '';

    if (productos.length === 0) {
        productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">No hay productos cargados todavía.</p>';
        return;
    }

    productos.forEach(prod => {
        const card = document.createElement('article');
        card.classList.add('product-card');
        card.dataset.id = prod.id;
        card.dataset.categoria = prod.categoria;
        card.dataset.genero = prod.genero;
        card.dataset.clima = prod.clima;

        // Estado de disponibilidad
        const estaAgotado = prod.agotado || false;

        card.innerHTML = `
            <div class="image-container">
                <img class="product-image" src="${prod.imagen}" alt="${prod.titulo}">
                ${estaAgotado ? '<div class="badge-agotado">AGOTADO</div>' : ''}
            </div>
            <div class="product-info">
                <h2 class="product-title">${prod.titulo}</h2>
                <div class="product-tags">
                    <span class="tag"><b>Sexo:</b> ${prod.genero.charAt(0).toUpperCase() + prod.genero.slice(1)}</span>
                    <span class="tag"><b>Talle:</b> ${prod.talle}</span>
                    <span class="tag"><b>Clima:</b> ${prod.clima.charAt(0).toUpperCase() + prod.clima.slice(1)}</span>
                </div>
                <p class="product-price" data-precio="${prod.precio}">$${Number(prod.precio).toLocaleString('es-AR')}</p>
                <button class="btn-add-cart" ${estaAgotado ? 'disabled' : ''}>
                    ${estaAgotado ? 'Sin Stock' : 'Agregar al carrito'}
                </button>
            </div>
        `;

        // Acciones exclusivas en Modo Admin
        if (esAdmin) {
            const adminContainer = document.createElement('div');
            adminContainer.classList.add('admin-card-actions');

            // Botón alternar Agotado/Disponible
            const btnToggleAgotado = document.createElement('button');
            btnToggleAgotado.classList.add('btn-toggle-agotado');
            btnToggleAgotado.innerText = estaAgotado ? '✅ Marcar Disponible' : '⚠️ Marcar Agotado';
            btnToggleAgotado.addEventListener('click', async () => {
                const docRef = doc(db, "productos", prod.id);
                await updateDoc(docRef, { agotado: !estaAgotado });
            });

            // Botón Eliminar
            const btnDelete = document.createElement('button');
            btnDelete.classList.add('btn-delete-prod');
            btnDelete.innerText = '🗑️ Eliminar';
            btnDelete.addEventListener('click', async () => {
                if (confirm(`¿Eliminar "${prod.titulo}" de la tienda?`)) {
                    await deleteDoc(doc(db, "productos", prod.id));
                }
            });

            adminContainer.appendChild(btnToggleAgotado);
            adminContainer.appendChild(btnDelete);
            card.querySelector('.product-info').appendChild(adminContainer);
        }

        // Evento agregar al carrito (Solo si hay stock)
        if (!estaAgotado) {
            card.querySelector('.btn-add-cart').addEventListener('click', () => {
                carrito.push({ id: prod.id, titulo: prod.titulo, precio: Number(prod.precio) });
                actualizarCarrito();
            });
        }

        productGrid.appendChild(card);
    });

    aplicarFiltros();
}

// ==========================================
// 2. AUTENTICACIÓN ADMIN (Firebase Auth)
// ==========================================

// Detector de sesión activa
onAuthStateChanged(auth, (user) => {
    if (user) {
        esAdmin = true;
        adminBar.classList.remove('hidden');
    } else {
        esAdmin = false;
        adminBar.classList.add('hidden');
    }
    renderizarProductos(productosLista);
});

// Triple clic para abrir modal de login
let contadorClics = 0;
let timerClics;

tituloPrincipal.addEventListener('click', () => {
    contadorClics++;
    clearTimeout(timerClics);

    if (contadorClics === 3) {
        if (!esAdmin) {
            modalLogin.classList.add('active');
        } else {
            alert("Ya estás autenticado como Administrador.");
        }
        contadorClics = 0;
    }

    timerClics = setTimeout(() => { contadorClics = 0; }, 800);
});

// Iniciar sesión con Firebase
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-user').value;
    const pass = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        modalLogin.classList.remove('active');
        formLogin.reset();
        alert("¡Acceso concedido como Administrador!");
    } catch (error) {
        alert("Error de autenticación: Verifica el correo y la contraseña.");
    }
});

// Cerrar sesión
btnLogout.addEventListener('click', async () => {
    await signOut(auth);
    alert("Sesión cerrada correctamente.");
});

// ==========================================
// 3. AGREGAR PRODUCTO A FIRESTORE
// ==========================================
btnOpenAddModal.addEventListener('click', () => modalAddProduct.classList.add('active'));
btnCerrarAdd.addEventListener('click', () => modalAddProduct.classList.remove('active'));
btnCerrarLogin.addEventListener('click', () => modalLogin.classList.remove('active'));

formAddProduct.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevoProducto = {
        titulo: document.getElementById('add-title').value,
        precio: parseFloat(document.getElementById('add-price').value),
        imagen: document.getElementById('add-image').value,
        talle: document.getElementById('add-size').value,
        categoria: document.getElementById('add-category').value,
        genero: document.getElementById('add-gender').value,
        clima: document.getElementById('add-climate').value,
        agotado: false, // Por defecto inicia disponible
        creadoEn: new Date()
    };

    try {
        await addDoc(collection(db, "productos"), nuevoProducto);
        modalAddProduct.classList.remove('active');
        formAddProduct.reset();
        alert("¡Producto guardado exitosamente en Firebase!");
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Ocurrió un error al guardar el producto.");
    }
});

// ==========================================
// 4. FUNCIONALIDAD DEL CARRITO
// ==========================================
function actualizarCarrito() {
    const total = carrito.reduce((sum, item) => sum + item.precio, 0);
    const totalFormateado = '$' + total.toLocaleString('es-AR');

    cartTotalHeader.innerText = totalFormateado;
    modalCartTotal.innerText = totalFormateado;

    renderizarItemsModal();
}

function renderizarItemsModal() {
    containerItems.innerHTML = '';

    if (carrito.length === 0) {
        containerItems.innerHTML = '<p style="text-align:center; color:#888;">El carrito está vacío.</p>';
        return;
    }

    carrito.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('cart-item');
        itemDiv.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.titulo}</h4>
                <p>$${item.precio.toLocaleString('es-AR')}</p>
            </div>
            <button class="btn-remove" data-index="${index}">&times;</button>
        `;
        containerItems.appendChild(itemDiv);
    });

    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            carrito.splice(index, 1);
            actualizarCarrito();
        });
    });
}

btnCarritoHeader.addEventListener('click', () => modalCarrito.classList.add('active'));
btnCerrarModal.addEventListener('click', () => modalCarrito.classList.remove('active'));

modalCarrito.addEventListener('click', (e) => {
    if (e.target === modalCarrito) modalCarrito.classList.remove('active');
});

// Número de teléfono sin el signo "+" para la URL de WhatsApp
const NUMERO_WHATSAPP = "5492995315935"; 

btnContactar.addEventListener('click', () => {
    if (carrito.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }

    let mensaje = "Hola, quisiera confirmar el stock de lo siguiente y forma de pagos y adquisición:\n\n";

    carrito.forEach((prod) => {
        mensaje += `• ${prod.titulo} - $${prod.precio.toLocaleString('es-AR')}\n`;
    });

    const total = carrito.reduce((sum, item) => sum + item.precio, 0);
    mensaje += `\n*Total:* $${total.toLocaleString('es-AR')}`;

    const mensajeURL = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensajeURL}`;

    window.open(urlWhatsApp, '_blank');
});

// ==========================================
// 5. FILTRADO DE PRODUCTOS
// ==========================================
const filtrosActivos = { categoria: 'todos', genero: 'todos', clima: 'todos' };
const botonesFiltro = document.querySelectorAll('.btn-filter');

botonesFiltro.forEach(boton => {
    boton.addEventListener('click', (e) => {
        const tipoFiltro = e.currentTarget.dataset.filterType;
        const valorFiltro = e.currentTarget.dataset.filterValue;

        const barraActual = e.currentTarget.closest('.sub-bar');
        barraActual.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        filtrosActivos[tipoFiltro] = valorFiltro;
        aplicarFiltros();
    });
});

function aplicarFiltros() {
    document.querySelectorAll('.product-card').forEach(producto => {
        const cumpleCat = filtrosActivos.categoria === 'todos' || producto.dataset.categoria === filtrosActivos.categoria;
        const cumpleGen = filtrosActivos.genero === 'todos' || producto.dataset.genero === filtrosActivos.genero;
        const cumpleCli = filtrosActivos.clima === 'todos' || producto.dataset.clima === filtrosActivos.clima;

        if (cumpleCat && cumpleGen && cumpleCli) {
            producto.style.display = 'flex';
        } else {
            producto.style.display = 'none';
        }
    });
}
