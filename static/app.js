// Configuration
const API_URL = 'http://localhost:5000';

// Token Management
function getToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
}

function setToken(token) {
    sessionStorage.setItem('token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('loginTime', Date.now());
}

function clearToken() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userStatus');
    localStorage.removeItem('token');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('userStatus');
}

// Check if token is expired (24 hours)
function isTokenExpired() {
    const loginTime = localStorage.getItem('loginTime');
    if (!loginTime) return true;
    
    const currentTime = Date.now();
    const hoursPassed = (currentTime - parseInt(loginTime)) / (1000 * 60 * 60);
    return hoursPassed >= 24;
}

// Check Admin Status
async function checkAdminStatus() {
    const token = getToken();
    
    if (!token || isTokenExpired()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            clearToken();
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();
        sessionStorage.setItem('userStatus', data.status);
        localStorage.setItem('userStatus', data.status);

        if (data.status === 2) {
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('userPanel').style.display = 'none';
        } else {
            document.getElementById('adminPanel').style.display = 'none';
            document.getElementById('userPanel').style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        clearToken();
        window.location.href = 'login.html';
    }
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
});

// Load Products
async function loadProducts() {
    const token = getToken();
    const userStatus = sessionStorage.getItem('userStatus') || localStorage.getItem('userStatus');

    try {
        const response = await fetch(`${API_URL}/produto`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const produtos = await response.json();

        if (userStatus === '2') {
            renderAdminProducts(produtos);
        } else {
            renderUserProducts(produtos);
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

function renderUserProducts(produtos) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = produtos.map(p => `
        <div class="product-card">
            <img src="${p.imagem}" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/300x200?text=Sem+Imagem'">
            <h3>${p.nome}</h3>
            <p class="price">R$ ${parseFloat(p.preco).toFixed(2)}</p>
            <p class="stock">Estoque: ${p.quantidade}</p>
            <button class="btn-primary" onclick="addToCart(${p.id})" ${p.quantidade === 0 ? 'disabled' : ''}>
                ${p.quantidade === 0 ? 'Sem Estoque' : 'Adicionar ao Carrinho'}
            </button>
        </div>
    `).join('');
}

function renderAdminProducts(produtos) {
    const list = document.getElementById('adminProductList');
    if (!list) return;

    list.innerHTML = produtos.map(p => `
        <div class="admin-product-item">
            <div>
                <strong>${p.nome}</strong><br>
                <span style="color: var(--text-secondary);">
                    R$ ${parseFloat(p.preco).toFixed(2)} | 
                    Estoque: ${p.quantidade} | 
                    Status: ${p.status == 1 ? 'Ativo' : 'Inativo'}
                </span>
            </div>
            <div class="admin-product-actions">
                <button class="btn-secondary" onclick="editProduct(${p.id})">Editar</button>
                <button class="btn-danger" onclick="deleteProduct(${p.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

// Product Form Submit
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = getToken();
    const productId = document.getElementById('editProductId').value;
    const formData = new FormData();
    
    formData.append('nome', document.getElementById('productName').value);
    formData.append('preco', document.getElementById('productPrice').value);
    formData.append('quantidade', document.getElementById('productQuantity').value);
    formData.append('status', document.getElementById('productStatus').value);
    
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('imagem', imageFile);
    }

    try {
        const url = productId ? `${API_URL}/produto/${productId}` : `${API_URL}/produto`;
        const method = productId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (response.ok) {
            alert(productId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
            document.getElementById('productForm').reset();
            document.getElementById('editProductId').value = '';
            document.getElementById('imagePreview').innerHTML = '';
            loadProducts();
        } else {
            alert('Erro ao salvar produto!');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar produto!');
    }
});

// Image Preview
document.getElementById('productImage')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
});

// Edit Product
async function editProduct(id) {
    const token = getToken();
    
    try {
        const response = await fetch(`${API_URL}/produto/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const produto = await response.json();
        
        document.getElementById('editProductId').value = produto.id;
        document.getElementById('productName').value = produto.nome;
        document.getElementById('productPrice').value = produto.preco;
        document.getElementById('productQuantity').value = produto.quantidade;
        document.getElementById('productStatus').value = produto.status;
        
        if (produto.imagem) {
            document.getElementById('imagePreview').innerHTML = 
                `<img src="${produto.imagem}" style="max-width: 200px; border-radius: 8px;">`;
        }
        
        document.querySelector('.admin-form-card h3').textContent = 'Editar Produto';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
    }
}

// Cancel Edit
function cancelEdit() {
    document.getElementById('productForm').reset();
    document.getElementById('editProductId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.querySelector('.admin-form-card h3').textContent = 'Cadastrar Novo Produto';
}

// Delete Product
async function deleteProduct(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    const token = getToken();
    
    try {
        const response = await fetch(`${API_URL}/produto/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('Produto excluído com sucesso!');
            loadProducts();
        } else {
            alert('Erro ao excluir produto!');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir produto!');
    }
}

// Cart Functions
function addToCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: productId, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    alert('Produto adicionado ao carrinho!');
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countElement = document.getElementById('cartCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Initialize cart count on page load
updateCartCount();
