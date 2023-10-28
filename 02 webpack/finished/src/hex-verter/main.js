import {hex_lookup} from "./library/constants/lookup-tables";
import {dec_to_binary, binary_to_hex} from "./library/conversions";
import { group_binary } from "./library/formatting";

const decimal_input = document.getElementById("decimalInput");
const conversion_button = document.getElementById("convert-button");
const binary_step = document.getElementById("binary-raw");
const grouped_binary_step = document.getElementById("binary-grouped");
const grouped_hex_step = document.getElementById("hexadecimal-grouped");
const hex_output = document.getElementById("hexadecimal");

const click = () => {

    const binary = dec_to_binary(Number(decimal_input.value));
    binary_step.innerText = "binary: " + binary;
    
    var tempStr = "grouped: ";
    const grouped_binary = group_binary(binary);
    for (let i = 0; i < grouped_binary.length; i++) {
        tempStr += grouped_binary[i] + " ";
    }
    grouped_binary_step.innerText = tempStr;

    tempStr = "hex (grouped): ";
    for (let i = 0; i < grouped_binary.length; i++) {
        tempStr += String(binary_to_hex(grouped_binary[i])) + " ";
    }
    grouped_hex_step.innerText = tempStr;

    tempStr = "final: 0x";
    for (let i = 0; i < grouped_binary.length; i++) {
        tempStr += String(hex_lookup[binary_to_hex(grouped_binary[i])]);
    }
    hex_output.innerText = tempStr;
}

conversion_button.addEventListener("click", click);