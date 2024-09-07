export function dec_to_binary(number) {
    var digits = [];

    while (number > 0) {
        var digit = String(number % 2);
        number = (number - (number % 2))/ 2;
        digits.push(digit);
    }

    return digits.reverse().join("");
}

export function binary_to_hex(number) {
    var result = 0;

    for (let i = 0; i < 4; i++) {
        result += Number(number[i]) * 2**(3 - i);
    }

    return result;
}