// 配方管理相關功能

// 載入我的配方
async function loadMyFormulas() {
    try {
        const response = await fetch('/api/formulas?publicOnly=false', {
            credentials: 'include'
        });
        const data = await response.json();
        
        displayFormulas(data.formulas, 'my-formulas-list');
        
    } catch (error) {
        console.error('載入配方失敗:', error);
        showNotification('載入配方失敗', 'error');
    }
}

// 載入公開配方
async function loadPublicFormulas() {
    try {
        const response = await fetch('/api/formulas?publicOnly=true', {
            credentials: 'include'
        });
        const data = await response.json();
        
        displayFormulas(data.formulas, 'public-formulas-list');
        
    } catch (error) {
        console.error('載入公開配方失敗:', error);
        showNotification('載入公開配方失敗', 'error');
    }
}

// 顯示配方列表
function displayFormulas(formulas, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (formulas.length === 0) {
        container.innerHTML = '<p>無配方資料</p>';
        return;
    }
    
    formulas.forEach(formula => {
        const card = document.createElement('div');
        card.className = 'formula-card';
        card.innerHTML = `
            <h3>${escapeHtml(formula.name)}</h3>
            <p>${escapeHtml(formula.description || '無描述')}</p>
            <p>體積: ${formula.total_volume} ml</p>
            <div class="tags">
                ${formula.tags ? formula.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : ''}
            </div>
            <p class="meta">
                建立者: ${escapeHtml(formula.creator_name || formula.creator)}<br>
                建立時間: ${new Date(formula.created_at).toLocaleDateString('zh-TW')}
            </p>
            <div class="card-actions">
                <button class="btn btn-primary btn-sm" onclick="viewFormula(${formula.id})">檢視</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 檢視配方詳情
async function viewFormula(id) {
    try {
        const response = await fetch(`/api/formulas/${id}`, {
            credentials: 'include'
        });
        const formula = await response.json();
        
        if (response.ok) {
            displayFormulaDetail(formula);
        } else {
            showNotification(formula.error || '無法載入配方', 'error');
        }
        
    } catch (error) {
        console.error('載入配方詳情失敗:', error);
        showNotification('載入配方詳情失敗', 'error');
    }
}

// 顯示配方詳情
function displayFormulaDetail(formula) {
    // 建立詳情頁面內容
    const detailHtml = `
        <div class="container">
            <h1>${escapeHtml(formula.name)}</h1>
            <p>${escapeHtml(formula.description || '')}</p>
            
            <div class="formula-info">
                <p><strong>總體積:</strong> ${formula.total_volume} ml</p>
                <p><strong>建立者:</strong> ${escapeHtml(formula.creator_name || formula.creator)}</p>
                <p><strong>建立時間:</strong> ${new Date(formula.created_at).toLocaleDateString('zh-TW')}</p>
                <p><strong>公開狀態:</strong> ${formula.is_public ? '公開' : '私人'}</p>
            </div>
            
            <h2>配方成分</h2>
            <table class="ingredients-table">
                <thead>
                    <tr>
                        <th>化學品名稱</th>
                        <th>目標濃度 (M)</th>
                        <th>原料濃度 (%)</th>
                        <th>分子量 (g/mol)</th>
                        <th>所需質量 (g)</th>
                    </tr>
                </thead>
                <tbody>
                    ${formula.ingredients.map(ing => `
                        <tr>
                            <td>${escapeHtml(ing.chemical_name)}</td>
                            <td>${ing.target_concentration}</td>
                            <td>${ing.raw_concentration}</td>
                            <td>${ing.molecular_weight}</td>
                            <td><strong>${ing.calculated_mass.toFixed(4)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="actions">
                <button class="btn btn-secondary" onclick="navigateTo('formulas')">返回列表</button>
            </div>
        </div>
    `;
    
    // 建立或更新詳情頁面
    let detailPage = document.getElementById('formula-detail-page');
    if (!detailPage) {
        detailPage = document.createElement('div');
        detailPage.id = 'formula-detail-page';
        detailPage.className = 'page';
        document.getElementById('main-content').appendChild(detailPage);
    }
    
    detailPage.innerHTML = detailHtml;
    detailPage.style.display = 'block';
    
    // 隱藏其他頁面
    document.querySelectorAll('.page').forEach(p => {
        if (p.id !== 'formula-detail-page') {
            p.style.display = 'none';
        }
    });
}

// 計算化學品質量
function calculateMass(targetConcentration, totalVolume, molecularWeight, rawConcentration) {
    // 所需質量(g) = (目標濃度 × 體積(L) × 分子量) / 原料濃度(%)
    const volumeInLiters = totalVolume / 1000;
    return (targetConcentration * volumeInLiters * molecularWeight) / (rawConcentration / 100);
}
