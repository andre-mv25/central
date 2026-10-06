from decimal import Decimal, ROUND_HALF_UP
from typing import Optional


def round_decimal(value: Decimal, places: int = 2) -> Decimal:
    quantize_exp = Decimal("0.1") ** places
    return value.quantize(quantize_exp, rounding=ROUND_HALF_UP)


def round_weight(value: Decimal) -> Decimal:
    return round_decimal(value, 3)


def round_price(value: Decimal) -> Decimal:
    return round_decimal(value, 4)


def round_money(value: Decimal) -> Decimal:
    return round_decimal(value, 2)


def calculate_total(kilos: Decimal, price_per_kg: Decimal) -> Decimal:
    return round_money(kilos * price_per_kg)


def calculate_price_per_kg(total: Decimal, kilos: Decimal) -> Optional[Decimal]:
    if kilos == 0:
        return None
    return round_price(total / kilos)


def calculate_percentage(part: Decimal, total: Decimal) -> Decimal:
    if total == 0:
        return Decimal("0")
    return round_decimal((part / total) * Decimal("100"), 2)


def distribute_by_weight(amount: Decimal, weights: list[Decimal]) -> list[Decimal]:
    total_weight = sum(weights)
    if total_weight == 0:
        return [Decimal("0")] * len(weights)
    return [round_money(amount * (w / total_weight)) for w in weights]


def distribute_by_price(amount: Decimal, prices: list[Decimal], weights: list[Decimal]) -> list[Decimal]:
    total_value = sum(p * w for p, w in zip(prices, weights))
    if total_value == 0:
        return [Decimal("0")] * len(prices)
    return [round_money(amount * (p * w / total_value)) for p, w in zip(prices, weights)]


def format_kg(value: Decimal) -> str:
    return f"{value:,.3f}".replace(",", ".")


def format_money(value: Decimal) -> str:
    return f"${value:,.2f}".replace(",", ".")


def format_price_kg(value: Decimal) -> str:
    return f"${value:,.4f}/kg".replace(",", ".")