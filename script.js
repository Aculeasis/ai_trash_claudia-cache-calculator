// Дефолтные значения параметров
const defaultParams = {
    promptSize: 2000,
    maxPromptSize: 10000,
    trimmedSize: 5000,
    modelResponseSize: 250,
    userMessageSize: 20,
    iterations: 50,
    sendingCost: 3,
    modelCost: 15,
    cacheMissMultiplier: 1.25,
    cacheHitMultiplier: 0.1,
    calculateToMax: true
};

// Глобальные переменные для пагинации
let currentPage = 1;
const rowsPerPage = 50;
let allResults = [];

// Функция сброса параметров на дефолтные
function resetParameters() {
    document.getElementById('promptSize').value = defaultParams.promptSize;
    document.getElementById('maxPromptSize').value = defaultParams.maxPromptSize;
    document.getElementById('trimmedSize').value = defaultParams.trimmedSize;
    document.getElementById('modelResponseSize').value = defaultParams.modelResponseSize;
    document.getElementById('userMessageSize').value = defaultParams.userMessageSize;
    document.getElementById('iterations').value = defaultParams.iterations;
    document.getElementById('sendingCost').value = defaultParams.sendingCost;
    document.getElementById('modelCost').value = defaultParams.modelCost;
    document.getElementById('cacheMissMultiplier').value = defaultParams.cacheMissMultiplier;
    document.getElementById('cacheHitMultiplier').value = defaultParams.cacheHitMultiplier;
    document.getElementById('calculateToMax').checked = defaultParams.calculateToMax;
}

function calculateResults() {
    // Показываем индикатор загрузки
    document.getElementById('loading').style.display = 'block';
    
    // Откладываем вычисления, чтобы дать браузеру время показать индикатор загрузки
    setTimeout(() => {
        // Получаем значения из формы
        const promptSize = parseFloat(document.getElementById('promptSize').value);
        const maxPromptSize = parseFloat(document.getElementById('maxPromptSize').value);
        const trimmedSize = parseFloat(document.getElementById('trimmedSize').value);
        const modelResponseSize = parseFloat(document.getElementById('modelResponseSize').value);
        const userMessageSize = parseFloat(document.getElementById('userMessageSize').value);
        let iterations = parseInt(document.getElementById('iterations').value);
        const sendingCost = parseFloat(document.getElementById('sendingCost').value);
        const modelCost = parseFloat(document.getElementById('modelCost').value);
        const cacheMissMultiplier = parseFloat(document.getElementById('cacheMissMultiplier').value);
        const cacheHitMultiplier = parseFloat(document.getElementById('cacheHitMultiplier').value);
        const calculateToMax = document.getElementById('calculateToMax').checked;
        
        // Проверка валидности входных данных
        if (trimmedSize > maxPromptSize) {
            alert('Размер после обрезки не может быть больше максимального размера промта');
            document.getElementById('loading').style.display = 'none';
            return;
        }
        
        // Если выбрана опция расчета до максимального размера промта
        if (calculateToMax) {
            // Рассчитываем количество итераций для достижения максимального размера промта
            // Формула: (maxPromptSize - promptSize - userMessageSize) / (modelResponseSize + userMessageSize)
            const messageSize = modelResponseSize + userMessageSize;
            iterations = Math.ceil((maxPromptSize - promptSize - userMessageSize) / messageSize);
            
            // Убираем обновление поля ввода итераций
            // document.getElementById('iterations').value = iterations;
        }
        
        // Рассчитываем стоимость для каждой итерации
        let runningPromptSize = promptSize + userMessageSize; // Начинаем с учетом первого сообщения пользователя!
        let totalCostWithCache = 0;
        let totalCostWithoutCache = 0;
        const results = [];
        
        // Флаг, показывающий, была ли обрезка
        let wasTrimmed = false;
        // Счетчик фактического количества итераций
        let actualIterations = 0;
        
        for (let i = 1; i <= iterations; i++) {
            actualIterations++;
            const sendingTokens = runningPromptSize;
            const receivingTokens = modelResponseSize;
            
            // Стоимость без кэша
            const sendingCostNoCache = sendingTokens * sendingCost / 1000000;
            const receivingCostNoCache = receivingTokens * modelCost / 1000000;
            const iterCostNoCache = sendingCostNoCache + receivingCostNoCache;
            
            // Стоимость с кэшем
            let cacheHitTokens, cacheMissTokens;
            
            if (i === 1 || wasTrimmed) {
                // Первая итерация или после обрезки - особая логика
                if (wasTrimmed) {
                    // После обрезки только начальный промт в кэше
                    cacheHitTokens = promptSize; 
                    cacheMissTokens = sendingTokens - promptSize;
                } else {
                    // Первая итерация - ничего в кэше нет
                    cacheHitTokens = 0;
                    cacheMissTokens = sendingTokens;
                }
                wasTrimmed = false; // Сбрасываем флаг обрезки
            } else {
                // В обычной ситуации в кэше всё, кроме последнего ответа модели и сообщения пользователя
                cacheHitTokens = sendingTokens - (modelResponseSize + userMessageSize);
                cacheMissTokens = modelResponseSize + userMessageSize;
            }
            
            const sendingCostWithCache = 
                (cacheHitTokens * sendingCost * cacheHitMultiplier / 1000000) + 
                (cacheMissTokens * sendingCost * cacheMissMultiplier / 1000000);
                
            const iterCostWithCache = sendingCostWithCache + receivingCostNoCache;
            
            // Разница
            const difference = iterCostNoCache - iterCostWithCache;
            const differencePercent = (difference / iterCostNoCache) * 100;
            
            // Сохранение результатов
            results.push({
                iteration: i,
                promptSize: runningPromptSize,
                costWithCache: iterCostWithCache,
                costWithoutCache: iterCostNoCache,
                difference: difference,
                differencePercent: differencePercent.toFixed(4)
            });
            
            // Отслеживание общей стоимости
            totalCostWithCache += iterCostWithCache;
            totalCostWithoutCache += iterCostNoCache;
            
            // Увеличение размера промта для следующей итерации
            runningPromptSize += modelResponseSize + userMessageSize;
            
            // Проверка на превышение максимального размера
            if (runningPromptSize > maxPromptSize) {
                if (calculateToMax) {
                    // Если выбрана опция расчета до максимального размера, заканчиваем вычисления
                    break;
                }
                runningPromptSize = trimmedSize;
                wasTrimmed = true; // Устанавливаем флаг обрезки
            }
        }
        
        // Отображение результатов в таблице
        displayResults(results);
        
        // Отображение итогового результата
        const totalDifference = totalCostWithoutCache - totalCostWithCache;
        const totalDifferencePercent = (totalDifference / totalCostWithoutCache) * 100;
        
        displaySummary(totalCostWithCache, totalCostWithoutCache, totalDifference, totalDifferencePercent, actualIterations);
        
        // Скрываем индикатор загрузки
        document.getElementById('loading').style.display = 'none';
    }, 100); // Небольшая задержка, чтобы показать индикатор загрузки
}

function displayResults(results) {
    allResults = results;
    displayPage(1);
}

function displayPage(page) {
    currentPage = page;
    const tableBody = document.getElementById('resultsBody');
    tableBody.innerHTML = '';
    
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedResults = allResults.slice(start, end);
    
    paginatedResults.forEach(result => {
        const row = document.createElement('tr');
        
        const iterationCell = document.createElement('td');
        iterationCell.textContent = result.iteration;
        row.appendChild(iterationCell);
        
        const promptSizeCell = document.createElement('td');
        promptSizeCell.textContent = result.promptSize.toLocaleString();
        row.appendChild(promptSizeCell);
        
        const costWithCacheCell = document.createElement('td');
        costWithCacheCell.textContent = '$' + result.costWithCache.toFixed(8);
        row.appendChild(costWithCacheCell);
        
        const costWithoutCacheCell = document.createElement('td');
        costWithoutCacheCell.textContent = '$' + result.costWithoutCache.toFixed(8);
        row.appendChild(costWithoutCacheCell);
        
        const differenceCell = document.createElement('td');
        differenceCell.textContent = '$' + result.difference.toFixed(8);
        differenceCell.className = result.difference >= 0 ? 'positive' : 'negative';
        row.appendChild(differenceCell);
        
        const differencePercentCell = document.createElement('td');
        differencePercentCell.textContent = result.differencePercent + '%';
        differencePercentCell.className = result.differencePercent >= 0 ? 'positive' : 'negative';
        row.appendChild(differencePercentCell);
        
        tableBody.appendChild(row);
    });
    
    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(allResults.length / rowsPerPage);
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const paginationContainer = document.querySelector('.pagination');

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;

    pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;

    // Скрываем пагинацию, если всего одна страница
    paginationContainer.style.display = totalPages <= 1 ? 'none' : 'flex';

    // Добавляем номера страниц
    const pageNumbersContainer = document.createElement('div');
    pageNumbersContainer.className = 'page-numbers';
    for (let i = 1; i <= totalPages; i++) {
        const pageNumber = document.createElement('button');
        pageNumber.textContent = i;
        pageNumber.className = 'page-number';
        pageNumber.disabled = (i === currentPage);
        pageNumber.addEventListener('click', () => displayPage(i));
        pageNumbersContainer.appendChild(pageNumber);
    }

    // Удаляем предыдущие номера страниц, если есть
    const existingPageNumbers = document.querySelector('.page-numbers');
    if (existingPageNumbers) {
        paginationContainer.removeChild(existingPageNumbers);
    }
    paginationContainer.appendChild(pageNumbersContainer);
}

// Добавляем обработчики событий для кнопок пагинации
document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        displayPage(currentPage - 1);
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(allResults.length / rowsPerPage);
    if (currentPage < totalPages) {
        displayPage(currentPage + 1);
    }
});

function displaySummary(totalCostWithCache, totalCostWithoutCache, totalDifference, totalDifferencePercent, iterations) {
    const summaryDiv = document.getElementById('summary');
    summaryDiv.style.display = 'block';
    
    const summaryHTML = `
        <h3>Final Result:</h3>
        <p>Total Cost with Cache: <strong>$${totalCostWithCache.toFixed(8)}</strong></p>
        <p>Total Cost without Cache: <strong>$${totalCostWithoutCache.toFixed(8)}</strong></p>
        <p>Savings: <strong class="${totalDifference >= 0 ? 'positive' : 'negative'}">
            $${totalDifference.toFixed(8)} (${totalDifferencePercent.toFixed(4)}%)
        </strong></p>
        <p>Number of Iterations: <strong>${iterations}</strong></p>
    `;
    
    summaryDiv.innerHTML = summaryHTML;
}

// Выполняем расчет при загрузке страницы
document.addEventListener('DOMContentLoaded', calculateResults); 