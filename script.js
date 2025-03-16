// Глобальная переменная для текущего языка
let currentLang = 'en';
let translations = {};
// Глобальная переменная для текущей темы
let currentTheme = 'dark';

// Загрузка переводов
async function loadTranslations() {
    try {
        const response = await fetch(`locales/${currentLang}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        translations = await response.json();
        updateUILanguage();
    } catch (error) {
        console.error(`Failed to load translations for ${currentLang}:`, error);
        // Если не удалось загрузить перевод, используем английский
        if (currentLang !== 'en') {
            currentLang = 'en';
            loadTranslations();
        }
    }
}

// Функция для получения перевода
function t(key) {
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
            result = result[k];
        } else {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
    }
    
    return result;
}

// Обновление интерфейса при смене языка
function updateUILanguage() {
    // Обновляем заголовок
    document.querySelector('h1').textContent = t('title');
    
    // Обновляем заголовки разделов
    document.querySelector('.form-section h2').textContent = t('params.title');
    document.querySelector('.results-section h2').textContent = t('results.title');
    
    // Обновляем подписи полей ввода
    document.querySelector('label[for="promptSize"]').textContent = t('params.promptSize');
    document.querySelector('label[for="maxPromptSize"]').textContent = t('params.maxPromptSize');
    document.querySelector('label[for="trimmedSize"]').textContent = t('params.trimmedSize');
    document.querySelector('label[for="modelResponseSize"]').textContent = t('params.modelResponseSize');
    document.querySelector('label[for="userMessageSize"]').textContent = t('params.userMessageSize');
    document.querySelector('label[for="iterations"]').textContent = t('params.iterations');
    document.querySelector('label[for="calculateToMax"]').textContent = t('params.calculateToMax');
    document.querySelector('label[for="sendingCost"]').textContent = t('params.sendingCost');
    document.querySelector('label[for="modelCost"]').textContent = t('params.modelCost');
    document.querySelector('label[for="cacheMissMultiplier"]').textContent = t('params.cacheMissMultiplier');
    document.querySelector('label[for="cacheHitMultiplier"]').textContent = t('params.cacheHitMultiplier');
    
    // Обновляем кнопки
    document.querySelector('.reset-button').textContent = t('buttons.reset');
    document.querySelector('.calculate-button').textContent = t('buttons.calculate');
    document.getElementById('prevPage').textContent = t('buttons.prevPage');
    document.getElementById('nextPage').textContent = t('buttons.nextPage');
    
    // Обновляем подписи в таблице результатов
    const tableHeaders = document.querySelectorAll('#resultsTable th');
    tableHeaders[0].textContent = t('results.iteration');
    tableHeaders[1].textContent = t('results.promptSize');
    tableHeaders[2].textContent = t('results.withCache');
    tableHeaders[3].textContent = t('results.withoutCache');
    tableHeaders[4].textContent = t('results.difference');
    tableHeaders[5].textContent = t('results.differencePercent');
    
    // Обновляем текст "загрузка"
    document.querySelector('#loading p').textContent = t('results.calculating');
    
    // Обновляем текст в футере
    document.querySelector('.footer p:first-child').textContent = t('footer.description');
    
    // Обновляем поля сводки, если есть
    const summary = document.getElementById('summary');
    if (summary.style.display !== 'none') {
        updateSummary();
    }
    
    // Обновляем информацию о странице
    updatePaginationControls();
}

// Функция для переключения языка
function switchLanguage(lang) {
    if (currentLang === lang) return;
    
    currentLang = lang;
    
    // Обновляем отображаемый флаг и текст
    document.getElementById('current-flag').src = `flags/${lang}.svg`;
    document.getElementById('current-language').textContent = lang.toUpperCase();
    
    // Загружаем переводы и обновляем интерфейс
    loadTranslations();
    
    // Сохраняем выбранный язык в localStorage
    localStorage.setItem('preferredLanguage', lang);
}

// Восстановление языка из localStorage при загрузке страницы
function initLanguage() {
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) {
        currentLang = savedLang;
    }
    
    // Обновляем отображаемый флаг и текст
    document.getElementById('current-flag').src = `flags/${currentLang}.svg`;
    document.getElementById('current-language').textContent = currentLang.toUpperCase();
    
    // Загружаем переводы
    loadTranslations();
    
    // Обработчик клика по селектору языка
    document.querySelector('.selected-language').addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelector('.language-dropdown').classList.toggle('show');
    });
    
    // Закрытие меню при клике в другом месте
    document.addEventListener('click', function() {
        document.querySelector('.language-dropdown').classList.remove('show');
    });
    
    // Добавляем обработчики событий для переключения языка
    document.querySelectorAll('.language-dropdown li').forEach(li => {
        li.addEventListener('click', function(e) {
            e.stopPropagation();
            switchLanguage(this.getAttribute('data-lang'));
            document.querySelector('.language-dropdown').classList.remove('show');
        });
    });
}

// Инициализация темы
function initTheme() {
    // Проверяем сохраненную тему в localStorage
    const savedTheme = localStorage.getItem('preferredTheme');
    
    if (savedTheme) {
        // Используем сохраненную тему
        setTheme(savedTheme);
    } else {
        // По умолчанию используем темную тему
        setTheme('dark');
    }
    
    // Обработчик клика по селектору темы
    document.querySelector('.selected-theme').addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelector('.theme-dropdown').classList.toggle('show');
    });
    
    // Закрытие меню при клике в другом месте
    document.addEventListener('click', function() {
        document.querySelector('.theme-dropdown').classList.remove('show');
    });
    
    // Добавляем обработчики событий для переключения темы
    document.querySelectorAll('.theme-dropdown li').forEach(li => {
        li.addEventListener('click', function(e) {
            e.stopPropagation();
            setTheme(this.getAttribute('data-theme'));
            document.querySelector('.theme-dropdown').classList.remove('show');
        });
    });
}

// Функция установки темы
function setTheme(theme) {
    let actualTheme = theme;
    
    // Если выбрана автоматическая тема, определяем на основе системных настроек
    if (theme === 'auto') {
        // Проверяем предпочтения системы
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
        actualTheme = prefersDarkScheme ? 'dark' : 'light';
    }
    
    // Устанавливаем атрибут темы для корневого элемента
    document.documentElement.setAttribute('data-theme', actualTheme);
    
    // Обновляем текущую тему
    currentTheme = theme;
    
    // Обновляем отображение текущей темы
    updateThemeDisplay(theme);
    
    // Сохраняем выбранную тему в localStorage
    localStorage.setItem('preferredTheme', theme);
}

// Функция обновления отображения текущей темы
function updateThemeDisplay(theme) {
    // Обновляем только иконку
    const themeIcon = document.getElementById('current-theme-icon');
    
    // Устанавливаем соответствующую иконку
    if (theme === 'auto') {
        themeIcon.className = 'fas fa-adjust';
    } else if (theme === 'light') {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
}

// Отслеживание изменений системной темы для режима 'auto'
function setupSystemThemeListener() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (currentTheme === 'auto') {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
        }
    });
}

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
                differencePercent: differencePercent
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
        
        // Сохраняем данные сводки для обновления при смене языка
        summaryData = {
            totalCostWithCache,
            totalCostWithoutCache,
            totalDifference,
            totalDifferencePercent,
            iterations: actualIterations
        };
        
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
        differencePercentCell.textContent = result.differencePercent.toFixed(4) + '%';
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

    // Исправляем формат отображения страниц
    const pageText = t('results.page');
    const ofText = t('results.of');
    pageInfo.textContent = `${pageText} ${currentPage} ${ofText} ${totalPages}`;

    // Скрываем пагинацию, если всего одна страница
    paginationContainer.style.display = totalPages <= 1 ? 'none' : 'flex';

    // Удаляем предыдущие номера страниц, если есть
    const existingPageNumbers = document.querySelector('.page-numbers');
    if (existingPageNumbers) {
        paginationContainer.removeChild(existingPageNumbers);
    }

    // Создаем контейнер для номеров страниц
    const pageNumbersContainer = document.createElement('div');
    pageNumbersContainer.className = 'page-numbers';

    // Определяем, сколько страниц показывать до и после текущей
    const maxVisiblePages = 10; // Максимальное количество видимых страниц
    const siblingsCount = 2; // Количество страниц до и после текущей
    
    let startPage = Math.max(1, currentPage - siblingsCount);
    let endPage = Math.min(totalPages, currentPage + siblingsCount);
    
    // Добавляем кнопки для перехода в начало и конец
    const showStartEllipsis = startPage > 1;
    const showEndEllipsis = endPage < totalPages;
    
    // Корректируем количество отображаемых страниц, если общее число страниц не превышает maxVisiblePages
    if (totalPages <= maxVisiblePages) {
        startPage = 1;
        endPage = totalPages;
    } else {
        // Если мы находимся ближе к началу, показываем больше страниц справа
        if (currentPage <= siblingsCount + 1) {
            endPage = Math.min(maxVisiblePages - 1, totalPages);
        } 
        // Если мы находимся ближе к концу, показываем больше страниц слева
        else if (currentPage >= totalPages - siblingsCount) {
            startPage = Math.max(1, totalPages - maxVisiblePages + 2);
        }
        // В остальных случаях равномерно распределяем страницы
        else {
            const pagesBeforeAndAfter = Math.floor((maxVisiblePages - 3) / 2);
            startPage = Math.max(1, currentPage - pagesBeforeAndAfter);
            endPage = Math.min(totalPages, currentPage + pagesBeforeAndAfter);
        }
    }
    
    // Добавляем кнопку для первой страницы
    if (showStartEllipsis) {
        const firstPageBtn = document.createElement('button');
        firstPageBtn.textContent = '1';
        firstPageBtn.className = 'page-number';
        firstPageBtn.addEventListener('click', () => displayPage(1));
        pageNumbersContainer.appendChild(firstPageBtn);
        
        // Добавляем многоточие, если нужно
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'ellipsis';
            pageNumbersContainer.appendChild(ellipsis);
        }
    }
    
    // Добавляем номера страниц
    for (let i = startPage; i <= endPage; i++) {
        const pageNumber = document.createElement('button');
        pageNumber.textContent = i;
        pageNumber.className = i === currentPage ? 'page-number active' : 'page-number';
        pageNumber.disabled = (i === currentPage);
        pageNumber.addEventListener('click', () => displayPage(i));
        pageNumbersContainer.appendChild(pageNumber);
    }
    
    // Добавляем кнопку для последней страницы
    if (showEndEllipsis) {
        // Добавляем многоточие, если нужно
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'ellipsis';
            pageNumbersContainer.appendChild(ellipsis);
        }
        
        const lastPageBtn = document.createElement('button');
        lastPageBtn.textContent = totalPages;
        lastPageBtn.className = 'page-number';
        lastPageBtn.addEventListener('click', () => displayPage(totalPages));
        pageNumbersContainer.appendChild(lastPageBtn);
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
    
    // Получаем все тексты перевода заранее
    const titleText = t('summary.title');
    const withCacheText = t('summary.totalCostWithCache');
    const withoutCacheText = t('summary.totalCostWithoutCache');
    const savingsText = t('summary.savings');
    const iterationsText = t('summary.iterations');
    
    const summaryHTML = `
        <h3>${titleText}</h3>
        <p>${withCacheText} <strong>$${totalCostWithCache.toFixed(8)}</strong></p>
        <p>${withoutCacheText} <strong>$${totalCostWithoutCache.toFixed(8)}</strong></p>
        <p>${savingsText} <strong class="${totalDifference >= 0 ? 'positive' : 'negative'}">
            $${totalDifference.toFixed(8)} (${totalDifferencePercent.toFixed(4)}%)
        </strong></p>
        <p>${iterationsText} <strong>${iterations}</strong></p>
    `;
    
    summaryDiv.innerHTML = summaryHTML;
}

// Сохраняем оригинальные данные сводки для обновления при смене языка
let summaryData = {
    totalCostWithCache: 0,
    totalCostWithoutCache: 0,
    totalDifference: 0,
    totalDifferencePercent: 0,
    iterations: 0
};

// Обновление сводки при смене языка
function updateSummary() {
    if (summaryData.iterations > 0) {
        displaySummary(
            summaryData.totalCostWithCache, 
            summaryData.totalCostWithoutCache, 
            summaryData.totalDifference, 
            summaryData.totalDifferencePercent, 
            summaryData.iterations
        );
    }
}

// Выполняем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initLanguage();  // Инициализация локализации
    initTheme();     // Инициализация темы
    setupSystemThemeListener(); // Настройка отслеживания системной темы
    calculateResults();  // Рассчет результатов по умолчанию
});