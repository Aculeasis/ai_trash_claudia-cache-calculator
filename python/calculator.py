import yaml
from tabulate import tabulate
from typing import Dict, List, Any
import sys

# Константы
TOKENS_PER_PRICE_UNIT = 1_000_000  # Стоимость указана за миллион токенов

class TokenCostCalculator:
    """Класс для расчета стоимости токенов с учетом кэширования."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Инициализация калькулятора.
        
        Args:
            config: Словарь с параметрами конфигурации
        """
        self.config = config
        self.validate_config()
        
    def validate_config(self) -> None:
        """Проверка корректности параметров конфигурации."""
        required_params = [
            'iterations', 'calculateToMax', 'promptSize', 'userMessageSize', 
            'modelResponseSize', 'maxPromptSize', 'trimmedSize', 'sendingCost', 
            'modelCost', 'cacheMissMultiplier', 'cacheHitMultiplier'
        ]
        
        for param in required_params:
            if param not in self.config:
                raise ValueError(f"В конфигурации отсутствует обязательный параметр: {param}")
    
    def calculate_sending_costs(self, iteration: int, sending_tokens: int, prompt_size: int, 
                               user_message_size: int, receiving_tokens: int, 
                               was_trimmed: bool) -> Dict[str, float]:
        """
        Расчет стоимости отправки токенов с учетом и без учета кэширования.
        
        Args:
            iteration: Номер итерации
            sending_tokens: Количество отправляемых токенов
            prompt_size: Размер начального промпта
            user_message_size: Размер сообщения пользователя
            receiving_tokens: Количество получаемых токенов
            was_trimmed: Был ли обрезан контекст
            
        Returns:
            Словарь со стоимостью отправки токенов
        """
        sending_cost = self.config['sendingCost']
        cache_miss_multiplier = self.config['cacheMissMultiplier']
        cache_hit_multiplier = self.config['cacheHitMultiplier']
        
        # Стоимость без кэша
        sending_cost_no_cache = sending_tokens * sending_cost / TOKENS_PER_PRICE_UNIT
        
        # Стоимость с кэшем
        if iteration == 1 or was_trimmed:
            if was_trimmed:
                cache_hit_tokens = prompt_size
                cache_miss_tokens = sending_tokens - prompt_size
            else:
                cache_hit_tokens = 0
                cache_miss_tokens = sending_tokens
        else:
            cache_hit_tokens = sending_tokens - (receiving_tokens + user_message_size)
            cache_miss_tokens = receiving_tokens + user_message_size
        
        sending_cost_with_cache = (
            (cache_hit_tokens * sending_cost * cache_hit_multiplier / TOKENS_PER_PRICE_UNIT) +
            (cache_miss_tokens * sending_cost * cache_miss_multiplier / TOKENS_PER_PRICE_UNIT)
        )
        
        return {
            'without_cache': sending_cost_no_cache,
            'with_cache': sending_cost_with_cache
        }
    
    def calculate_iteration_cost(self, iteration: int, sending_tokens: int, 
                                receiving_tokens: int, prompt_size: int, 
                                user_message_size: int, was_trimmed: bool) -> Dict[str, Any]:
        """
        Расчет стоимости одной итерации.
        
        Args:
            iteration: Номер итерации
            sending_tokens: Количество отправляемых токенов
            receiving_tokens: Количество получаемых токенов
            prompt_size: Размер начального промпта
            user_message_size: Размер сообщения пользователя
            was_trimmed: Был ли обрезан контекст
            
        Returns:
            Словарь с результатами расчета
        """
        model_cost = self.config['modelCost']
        
        # Расчет стоимости отправки
        sending_costs = self.calculate_sending_costs(
            iteration, sending_tokens, prompt_size, 
            user_message_size, receiving_tokens, was_trimmed
        )
        
        # Стоимость получения (одинакова с кэшем и без)
        receiving_cost = receiving_tokens * model_cost / TOKENS_PER_PRICE_UNIT
        
        # Итоговые стоимости
        cost_without_cache = sending_costs['without_cache'] + receiving_cost
        cost_with_cache = sending_costs['with_cache'] + receiving_cost
        
        # Разница и процент экономии
        difference = cost_without_cache - cost_with_cache
        difference_percent = (difference / cost_without_cache) * 100 if cost_without_cache != 0 else 0
        
        return {
            'iteration': iteration,
            'promptSize': sending_tokens,
            'costWithCache': cost_with_cache,
            'costWithoutCache': cost_without_cache,
            'difference': difference,
            'differencePercent': difference_percent
        }
    
    def calculate_results(self) -> Dict[str, Any]:
        """
        Расчет результатов для всех итераций.
        
        Returns:
            Словарь с результатами расчетов
        """
        params = self.config
        
        # Определение количества итераций
        iterations = params['iterations']
        if params['calculateToMax']:
            message_size = params['modelResponseSize'] + params['userMessageSize']
            max_iterations = (params['maxPromptSize'] - params['promptSize'] - params['userMessageSize']) // message_size
            if (params['maxPromptSize'] - params['promptSize'] - params['userMessageSize']) % message_size != 0:
                max_iterations += 1
            iterations = max_iterations
        
        running_prompt_size = params['promptSize'] + params['userMessageSize']
        total_cost_with_cache = 0
        total_cost_without_cache = 0
        results = []
        
        was_trimmed = False
        actual_iterations = 0
        
        for i in range(1, iterations + 1):
            actual_iterations += 1
            
            iteration_result = self.calculate_iteration_cost(
                i,
                running_prompt_size,
                params['modelResponseSize'],
                params['promptSize'],
                params['userMessageSize'],
                was_trimmed
            )
            
            results.append(iteration_result)
            
            total_cost_with_cache += iteration_result['costWithCache']
            total_cost_without_cache += iteration_result['costWithoutCache']
            
            running_prompt_size += params['modelResponseSize'] + params['userMessageSize']
            
            if running_prompt_size > params['maxPromptSize']:
                if params['calculateToMax']:
                    break
                running_prompt_size = params['trimmedSize']
                was_trimmed = True
            else:
                was_trimmed = False
        
        total_difference = total_cost_without_cache - total_cost_with_cache
        total_difference_percent = (total_difference / total_cost_without_cache) * 100 if total_cost_without_cache != 0 else 0
        
        return {
            'iterationResults': results,
            'summary': {
                'totalCostWithCache': total_cost_with_cache,
                'totalCostWithoutCache': total_cost_without_cache,
                'totalDifference': total_difference,
                'totalDifferencePercent': total_difference_percent,
                'iterations': actual_iterations
            }
        }


class ResultFormatter:
    """Класс для форматирования и вывода результатов."""
    
    @staticmethod
    def format_results(results: Dict[str, Any]) -> str:
        """
        Форматирование результатов расчетов в виде таблицы.
        
        Args:
            results: Словарь с результатами расчетов
            
        Returns:
            Отформатированная таблица результатов
        """
        headers = ["Iter", "Size", "With Cache ($)", "No Cache ($)", "Diff ($)", "Diff (%)"]
        table_data = []
        
        iteration_results = results['iterationResults']
        num_iterations = len(iteration_results)
        
        # Ограничиваем вывод для большого количества итераций
        if num_iterations > 30:
            # Первые 15 итераций
            for result in iteration_results[:15]:
                table_data.append(ResultFormatter._format_iteration_row(result))
            
            # Разделитель
            table_data.append(["...", "...", "...", "...", "...", "..."])
            
            # Последние 15 итераций
            for result in iteration_results[-15:]:
                table_data.append(ResultFormatter._format_iteration_row(result))
        else:
            # Все итерации, если их немного
            for result in iteration_results:
                table_data.append(ResultFormatter._format_iteration_row(result))
        
        # Итоговая строка
        summary = results['summary']
        table_data.append([
            "Total", 
            "", 
            f"{summary['totalCostWithCache']:.8f}", 
            f"{summary['totalCostWithoutCache']:.8f}", 
            f"{summary['totalDifference']:.8f}", 
            f"{summary['totalDifferencePercent']:.4f}"
        ])
        
        return tabulate(table_data, headers=headers, tablefmt="grid", stralign="right", numalign="right")
    
    @staticmethod
    def _format_iteration_row(result: Dict[str, Any]) -> List[str]:
        """
        Форматирование строки таблицы для одной итерации.
        
        Args:
            result: Словарь с результатами одной итерации
            
        Returns:
            Список значений для строки таблицы
        """
        return [
            result['iteration'],
            result['promptSize'],
            f"{result['costWithCache']:.8f}",
            f"{result['costWithoutCache']:.8f}",
            f"{result['difference']:.8f}",
            f"{result['differencePercent']:.4f}"
        ]


def load_config(config_path: str = 'config.yaml') -> Dict[str, Any]:
    """
    Загрузка конфигурации из YAML-файла.
    
    Args:
        config_path: Путь к файлу конфигурации
        
    Returns:
        Словарь с параметрами конфигурации
        
    Raises:
        FileNotFoundError: Если файл конфигурации не найден
        yaml.YAMLError: При ошибке парсинга YAML
    """
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Ошибка: Файл конфигурации '{config_path}' не найден.")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Ошибка при парсинге файла конфигурации: {e}")
        sys.exit(1)


def main():
    """Основная функция программы."""
    try:
        # Загрузка конфигурации
        config = load_config()
        
        # Инициализация калькулятора
        calculator = TokenCostCalculator(config)
        
        # Расчет результатов
        results = calculator.calculate_results()
        
        # Форматирование и вывод результатов
        formatted_results = ResultFormatter.format_results(results)
        print(formatted_results)
        
    except Exception as e:
        print(f"Произошла ошибка: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()