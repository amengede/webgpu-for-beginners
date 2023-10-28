export function group_binary(number) {
    var digits = [];

    const number_split = number.split("").reverse();
    var group_count = (number_split.length - (number_split.length % 4)) / 4 + 1;
    if (number_split.length % 4 == 0) {
        group_count -= 1;
    }

    var group = []

    for (let i = 0; i < number_split.length; i++) {
        group.push(number_split[i]);
        if (group.length == 4) {
            digits.push(group.reverse().join(""));
            group = [];
        }
    }

    for (let i = number_split.length; i < 4 * group_count; i++) {
        group.push("0");
        if (group.length == 4) {
            digits.push(group.reverse().join(""));
            group = [];
        }
    }

    return digits.reverse();
}