// Основная структура приложения
const App = (function() {
    // Инициализация приложения
    function init() {
        LanguageManager.init();
        ThemeManager.init();
        CalculationManager.init();
        
        // Привязка обработчиков событий
        setupEventListeners();
        
        // Выполняем первоначальный расчет при загрузке страницы
        CalculationManager.calculate();
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        document.querySelector('.reset-button').addEventListener('click', resetParameters);
        document.querySelector('.calculate-button').addEventListener('click', CalculationManager.calculate);
        document.getElementById('prevPage').addEventListener('click', () => UIManager.navigatePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => UIManager.navigatePage(1));
    }
    
    // Сброс параметров на значения по умолчанию
    function resetParameters() {
        const defaultParams = CalculationManager.getDefaultParams();
        Object.keys(defaultParams).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = defaultParams[key];
                } else {
                    element.value = defaultParams[key];
                }
            }
        });
    }
    
    return {
        init,
        resetParameters // Экспортируем для доступа из HTML
    };
})();

// Управление языками и переводами
const LanguageManager = (function() {
    let currentLang = 'en';
    let translations = {};
    
    function init() {
        // Восстановление языка из localStorage
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang) {
            currentLang = savedLang;
        }
        
        updateLanguageUI();
        loadTranslations();
        
        // Настройка обработчиков событий
        document.querySelector('.selected-language').addEventListener('click', function(e) {
            e.stopPropagation();
            document.querySelector('.language-dropdown').classList.toggle('show');
        });
        
        document.addEventListener('click', function() {
            document.querySelector('.language-dropdown').classList.remove('show');
        });
        
        document.querySelectorAll('.language-dropdown li').forEach(li => {
            li.addEventListener('click', function(e) {
                e.stopPropagation();
                switchLanguage(this.getAttribute('data-lang'));
                document.querySelector('.language-dropdown').classList.remove('show');
            });
        });
    }
    
    function updateLanguageUI() {
        document.getElementById('current-flag').src = `flags/${currentLang}.svg`;
        document.getElementById('current-language').textContent = currentLang.toUpperCase();
    }
    
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
            // Запасной вариант при ошибке загрузки
            if (currentLang !== 'en') {
                currentLang = 'en';
                loadTranslations();
            }
        }
    }
    
    function switchLanguage(lang) {
        if (currentLang === lang) return;
        
        currentLang = lang;
        updateLanguageUI();
        loadTranslations();
        localStorage.setItem('preferredLanguage', lang);
    }
    
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
    
    function updateUILanguage() {
        // Обновление заголовка
        document.querySelector('h1').textContent = t('title');
        
        // Обновление заголовков разделов
        document.querySelector('.form-section h2').textContent = t('params.title');
        document.querySelector('.results-section h2').textContent = t('results.title');
        
        // Обновление подписей полей ввода
        const labelSelectors = {
            'promptSize': 'params.promptSize',
            'maxPromptSize': 'params.maxPromptSize',
            'trimmedSize': 'params.trimmedSize',
            'modelResponseSize': 'params.modelResponseSize',
            'userMessageSize': 'params.userMessageSize',
            'iterations': 'params.iterations',
            'calculateToMax': 'params.calculateToMax',
            'sendingCost': 'params.sendingCost',
            'modelCost': 'params.modelCost',
            'cacheMissMultiplier': 'params.cacheMissMultiplier',
            'cacheHitMultiplier': 'params.cacheHitMultiplier'
        };
        
        Object.entries(labelSelectors).forEach(([id, translationKey]) => {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) {
                label.textContent = t(translationKey);
            }
        });
        
        // Обновление кнопок
        document.querySelector('.reset-button').textContent = t('buttons.reset');
        document.querySelector('.calculate-button').textContent = t('buttons.calculate');
        document.getElementById('prevPage').textContent = t('buttons.prevPage');
        document.getElementById('nextPage').textContent = t('buttons.nextPage');
        
        // Обновление заголовков таблицы
        const tableHeaders = document.querySelectorAll('#resultsTable th');
        const headerTranslations = [
            'results.iteration',
            'results.promptSize',
            'results.withCache',
            'results.withoutCache',
            'results.difference',
            'results.differencePercent'
        ];
        
        tableHeaders.forEach((header, index) => {
            if (index < headerTranslations.length) {
                header.textContent = t(headerTranslations[index]);
            }
        });
        
        // Обновление текста "загрузка"
        document.querySelector('#loading p').textContent = t('results.calculating');
        
        // Обновление текста в футере
        document.querySelector('.footer p:first-child').textContent = t('footer.description');
        
        // Обновление сводки и пагинации
        UIManager.updateSummary();
        UIManager.updatePaginationControls();
    }
    
    return {
        init,
        t,
        updateUILanguage
    };
})();

// Управление темой оформления
const ThemeManager = (function() {
    let currentTheme = 'dark';
    
    function init() {
        // Проверка сохраненной темы
        const savedTheme = localStorage.getItem('preferredTheme');
        
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            setTheme('dark');
        }
        
        setupEventListeners();
        setupSystemThemeListener();
    }
    
    function setupEventListeners() {
        document.querySelector('.selected-theme').addEventListener('click', function(e) {
            e.stopPropagation();
            document.querySelector('.theme-dropdown').classList.toggle('show');
        });
        
        document.addEventListener('click', function() {
            document.querySelector('.theme-dropdown').classList.remove('show');
        });
        
        document.querySelectorAll('.theme-dropdown li').forEach(li => {
            li.addEventListener('click', function(e) {
                e.stopPropagation();
                setTheme(this.getAttribute('data-theme'));
                document.querySelector('.theme-dropdown').classList.remove('show');
            });
        });
    }
    
    function setTheme(theme) {
        let actualTheme = theme;
        
        if (theme === 'auto') {
            const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
            actualTheme = prefersDarkScheme ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', actualTheme);
        currentTheme = theme;
        updateThemeDisplay(theme);
        localStorage.setItem('preferredTheme', theme);
    }
    
    function updateThemeDisplay(theme) {
        const themeIcon = document.getElementById('current-theme-icon');
        
        if (theme === 'auto') {
            themeIcon.className = 'fas fa-adjust';
        } else if (theme === 'light') {
            themeIcon.className = 'fas fa-sun';
        } else {
            themeIcon.className = 'fas fa-moon';
        }
    }
    
    function setupSystemThemeListener() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (currentTheme === 'auto') {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
            }
        });
    }
    
    return {
        init
    };
})();

// Управление расчетами и бизнес-логикой
const CalculationManager = (function() {
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
    
    let allResults = [];
    
    function init() {
        // При инициализации модуля можно добавить дополнительные действия
    }
    
    function getDefaultParams() {
        return { ...defaultParams };
    }
    
    function calculate() {
        UIManager.showLoading();
        
        // Откладываем вычисления, чтобы дать браузеру время показать индикатор загрузки
        setTimeout(() => {
            const params = getInputParameters();
            
            // Валидация параметров
            if (!validateParameters(params)) {
                UIManager.hideLoading();
                return;
            }
            
            // Расчет результатов
            const results = calculateResults(params);
            
            // Отображение результатов
            UIManager.displayResults(results.iterationResults);
            UIManager.displaySummary(results.summary);
            
            UIManager.hideLoading();
        }, 100);
    }
    
    function getInputParameters() {
        return {
            promptSize: parseFloat(document.getElementById('promptSize').value),
            maxPromptSize: parseFloat(document.getElementById('maxPromptSize').value),
            trimmedSize: parseFloat(document.getElementById('trimmedSize').value),
            modelResponseSize: parseFloat(document.getElementById('modelResponseSize').value),
            userMessageSize: parseFloat(document.getElementById('userMessageSize').value),
            iterations: parseInt(document.getElementById('iterations').value),
            sendingCost: parseFloat(document.getElementById('sendingCost').value),
            modelCost: parseFloat(document.getElementById('modelCost').value),
            cacheMissMultiplier: parseFloat(document.getElementById('cacheMissMultiplier').value),
            cacheHitMultiplier: parseFloat(document.getElementById('cacheHitMultiplier').value),
            calculateToMax: document.getElementById('calculateToMax').checked
        };
    }
    
    function validateParameters(params) {
        if (params.trimmedSize > params.maxPromptSize) {
            alert('Размер после обрезки не может быть больше максимального размера промта');
            return false;
        }
        return true;
    }
    
    function calculateResults(params) {
        let iterations = params.iterations;
        
        // Если выбрана опция расчета до максимального размера промта
        if (params.calculateToMax) {
            const messageSize = params.modelResponseSize + params.userMessageSize;
            iterations = Math.ceil((params.maxPromptSize - params.promptSize - params.userMessageSize) / messageSize);
        }
        
        // Рассчитываем стоимость для каждой итерации
        let runningPromptSize = params.promptSize + params.userMessageSize;
        let totalCostWithCache = 0;
        let totalCostWithoutCache = 0;
        const results = [];
        
        let wasTrimmed = false;
        let actualIterations = 0;
        
        for (let i = 1; i <= iterations; i++) {
            actualIterations++;
            
            const iterationResult = calculateIterationCost(
                i, 
                runningPromptSize, 
                params.modelResponseSize, 
                params.promptSize,
                params.userMessageSize,
                params.sendingCost, 
                params.modelCost, 
                params.cacheMissMultiplier, 
                params.cacheHitMultiplier, 
                wasTrimmed
            );
            
            results.push(iterationResult);
            
            // Отслеживание общей стоимости
            totalCostWithCache += iterationResult.costWithCache;
            totalCostWithoutCache += iterationResult.costWithoutCache;
            
            // Увеличение размера промта для следующей итерации
            runningPromptSize += params.modelResponseSize + params.userMessageSize;
            
            // Проверка на превышение максимального размера
            if (runningPromptSize > params.maxPromptSize) {
                if (params.calculateToMax) {
                    break;
                }
                runningPromptSize = params.trimmedSize;
                wasTrimmed = true;
            } else {
                wasTrimmed = false;
            }
        }
        
        // Подготовка итоговых данных
        const totalDifference = totalCostWithoutCache - totalCostWithCache;
        const totalDifferencePercent = (totalDifference / totalCostWithoutCache) * 100;
        
        return {
            iterationResults: results,
            summary: {
                totalCostWithCache,
                totalCostWithoutCache,
                totalDifference,
                totalDifferencePercent,
                iterations: actualIterations
            }
        };
    }
    
    function calculateIterationCost(iteration, sendingTokens, receivingTokens, promptSize, userMessageSize, sendingCost, modelCost, cacheMissMultiplier, cacheHitMultiplier, wasTrimmed) {
        // Стоимость без кэша
        const sendingCostNoCache = sendingTokens * sendingCost / 1000000;
        const receivingCostNoCache = receivingTokens * modelCost / 1000000;
        const iterCostNoCache = sendingCostNoCache + receivingCostNoCache;
        
        // Стоимость с кэшем
        let cacheHitTokens, cacheMissTokens;
        
        if (iteration === 1 || wasTrimmed) {
            if (wasTrimmed) {
                // После обрезки только начальный промт в кэше
                cacheHitTokens = promptSize; 
                cacheMissTokens = sendingTokens - promptSize;
            } else {
                // Первая итерация - ничего в кэше нет
                cacheHitTokens = 0;
                cacheMissTokens = sendingTokens;
            }
        } else {
            // В обычной ситуации в кэше всё, кроме последнего ответа модели и сообщения пользователя
            cacheHitTokens = sendingTokens - (receivingTokens + userMessageSize);
            cacheMissTokens = receivingTokens + userMessageSize;
        }
        
        const sendingCostWithCache = 
            (cacheHitTokens * sendingCost * cacheHitMultiplier / 1000000) + 
            (cacheMissTokens * sendingCost * cacheMissMultiplier / 1000000);
            
        const iterCostWithCache = sendingCostWithCache + receivingCostNoCache;
        
        // Разница
        const difference = iterCostNoCache - iterCostWithCache;
        const differencePercent = (difference / iterCostNoCache) * 100;
        
        return {
            iteration,
            promptSize: sendingTokens,
            costWithCache: iterCostWithCache,
            costWithoutCache: iterCostNoCache,
            difference,
            differencePercent
        };
    }
    
    return {
        init,
        getDefaultParams,
        calculate
    };
})();

// Управление интерфейсом пользователя
const UIManager = (function() {
    const rowsPerPage = 50;
    let currentPage = 1;
    let allResults = [];
    let summaryData = {
        totalCostWithCache: 0,
        totalCostWithoutCache: 0,
        totalDifference: 0,
        totalDifferencePercent: 0,
        iterations: 0
    };
    
    function showLoading() {
        document.getElementById('loading').style.display = 'block';
    }
    
    function hideLoading() {
        document.getElementById('loading').style.display = 'none';
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
            
            appendCell(row, result.iteration);
            appendCell(row, result.promptSize.toLocaleString());
            appendCell(row, '$' + result.costWithCache.toFixed(8));
            appendCell(row, '$' + result.costWithoutCache.toFixed(8));
            
            const diffCell = appendCell(row, '$' + result.difference.toFixed(8));
            diffCell.className = result.difference >= 0 ? 'positive' : 'negative';
            
            const percentCell = appendCell(row, result.differencePercent.toFixed(4) + '%');
            percentCell.className = result.differencePercent >= 0 ? 'positive' : 'negative';
            
            tableBody.appendChild(row);
        });
        
        updatePaginationControls();
    }
    
    function appendCell(row, text) {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.appendChild(cell);
        return cell;
    }
    
    function navigatePage(direction) {
        const totalPages = Math.ceil(allResults.length / rowsPerPage);
        const newPage = currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            displayPage(newPage);
        }
    }
    
    function updatePaginationControls() {
        const totalPages = Math.ceil(allResults.length / rowsPerPage);
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        const paginationContainer = document.querySelector('.pagination');

        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === totalPages;

        const pageText = LanguageManager.t('results.page');
        const ofText = LanguageManager.t('results.of');
        pageInfo.textContent = `${pageText} ${currentPage} ${ofText} ${totalPages}`;

        paginationContainer.style.display = totalPages <= 1 ? 'none' : 'flex';

        // Обновление номеров страниц
        updatePageNumbers(totalPages);
    }
    
    function updatePageNumbers(totalPages) {
        // Удаляем предыдущие номера страниц
        const existingPageNumbers = document.querySelector('.page-numbers');
        if (existingPageNumbers) {
            existingPageNumbers.remove();
        }

        const paginationContainer = document.querySelector('.pagination');
        const pageNumbersContainer = document.createElement('div');
        pageNumbersContainer.className = 'page-numbers';

        const maxVisiblePages = 10;
        const siblingsCount = 2;
        
        let startPage = Math.max(1, currentPage - siblingsCount);
        let endPage = Math.min(totalPages, currentPage + siblingsCount);
        
        // Оптимизируем отображение страниц
        if (totalPages <= maxVisiblePages) {
            startPage = 1;
            endPage = totalPages;
        } else {
            if (currentPage <= siblingsCount + 1) {
                endPage = Math.min(maxVisiblePages - 1, totalPages);
            } else if (currentPage >= totalPages - siblingsCount) {
                startPage = Math.max(1, totalPages - maxVisiblePages + 2);
            } else {
                const pagesBeforeAndAfter = Math.floor((maxVisiblePages - 3) / 2);
                startPage = Math.max(1, currentPage - pagesBeforeAndAfter);
                endPage = Math.min(totalPages, currentPage + pagesBeforeAndAfter);
            }
        }
        
        // Первая страница и многоточие
        if (startPage > 1) {
            appendPageButton(pageNumbersContainer, 1);
            
            if (startPage > 2) {
                appendEllipsis(pageNumbersContainer);
            }
        }
        
        // Номера страниц
        for (let i = startPage; i <= endPage; i++) {
            appendPageButton(pageNumbersContainer, i, i === currentPage);
        }
        
        // Последняя страница и многоточие
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                appendEllipsis(pageNumbersContainer);
            }
            
            appendPageButton(pageNumbersContainer, totalPages);
        }
        
        paginationContainer.appendChild(pageNumbersContainer);
    }
    
    function appendPageButton(container, pageNum, isActive = false) {
        const button = document.createElement('button');
        button.textContent = pageNum;
        button.className = isActive ? 'page-number active' : 'page-number';
        button.disabled = isActive;
        button.addEventListener('click', () => displayPage(pageNum));
        container.appendChild(button);
    }
    
    function appendEllipsis(container) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.className = 'ellipsis';
        container.appendChild(ellipsis);
    }
    
    function displaySummary(summary) {
        summaryData = summary;
        updateSummary();
    }
    
    function updateSummary() {
        if (summaryData.iterations === 0) return;
        
        const summaryDiv = document.getElementById('summary');
        summaryDiv.style.display = 'block';
        
        const titleText = LanguageManager.t('summary.title');
        const withCacheText = LanguageManager.t('summary.totalCostWithCache');
        const withoutCacheText = LanguageManager.t('summary.totalCostWithoutCache');
        const savingsText = LanguageManager.t('summary.savings');
        const iterationsText = LanguageManager.t('summary.iterations');
        
        const summaryHTML = `
            <h3>${titleText}</h3>
            <p>${withCacheText} <strong>$${summaryData.totalCostWithCache.toFixed(8)}</strong></p>
            <p>${withoutCacheText} <strong>$${summaryData.totalCostWithoutCache.toFixed(8)}</strong></p>
            <p>${savingsText} <strong class="${summaryData.totalDifference >= 0 ? 'positive' : 'negative'}">
                $${summaryData.totalDifference.toFixed(8)} (${summaryData.totalDifferencePercent.toFixed(4)}%)
            </strong></p>
            <p>${iterationsText} <strong>${summaryData.iterations}</strong></p>
        `;
        
        summaryDiv.innerHTML = summaryHTML;
    }
    
    return {
        showLoading,
        hideLoading,
        displayResults,
        displayPage,
        navigatePage,
        updatePaginationControls,
        displaySummary,
        updateSummary
    };
})();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', App.init);

// Глобальные функции для обратной совместимости с HTML-кодом
function resetParameters() {
    App.resetParameters();
}

function calculateResults() {
    CalculationManager.calculate();
}