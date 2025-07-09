const StringCalculator = require('./stringCalculator');

describe('StringCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new StringCalculator();
  });

  test('should return 0 for empty string', () => {
    expect(calculator.add('')).toBe(0);
  });

  test('should return the number itself for single number', () => {
    expect(calculator.add('1')).toBe(1);
    expect(calculator.add('5')).toBe(5);
  });

  test('should return sum of two comma-separated numbers', () => {
    expect(calculator.add('1,2')).toBe(3);
    expect(calculator.add('5,10')).toBe(15);
  });

  test('should handle unknown number of comma-separated numbers', () => {
    expect(calculator.add('1,2,3')).toBe(6);
    expect(calculator.add('1,2,3,4,5')).toBe(15);
    expect(calculator.add('10,20,30,40')).toBe(100);
  });

  test('should support newlines as separators', () => {
    expect(calculator.add('1\n2,3')).toBe(6);
    expect(calculator.add('1\n2\n3')).toBe(6);
    expect(calculator.add('1,2\n3,4')).toBe(10);
  });

  test('should support custom delimiters', () => {
    expect(calculator.add('//;\n1;2')).toBe(3);
    expect(calculator.add('//|\n1|2|3')).toBe(6);
    expect(calculator.add('//*\n1*2*3*4')).toBe(10);
  });

  test('should throw exception for negative numbers', () => {
    expect(() => calculator.add('-1,2')).toThrow('negatives not allowed: -1');
    expect(() => calculator.add('1,-2,-3')).toThrow('negatives not allowed: -2,-3');
    expect(() => calculator.add('//;\n1;-2;-3')).toThrow('negatives not allowed: -2,-3');
  });

  test('should ignore numbers larger than 1000', () => {
    expect(calculator.add('2,1001')).toBe(2);
    expect(calculator.add('1000,1001,2')).toBe(1002);
    expect(calculator.add('//;\n1;2000;3')).toBe(4);
  });

  test('should support variable-length delimiters', () => {
    expect(calculator.add('//[***]\n1***2***3')).toBe(6);
    expect(calculator.add('//[abc]\n1abc2abc3')).toBe(6);
    expect(calculator.add('//[xyz]\n1xyz2xyz3')).toBe(6);
  });

  test('should support multiple delimiters', () => {
    expect(calculator.add('//[*][%]\n1*2%3')).toBe(6);
    expect(calculator.add('//[;][|]\n1;2|3')).toBe(6);
  });

  test('should support multiple variable-length delimiters', () => {
    expect(calculator.add('//[***][###]\n1***2###3')).toBe(6);
    expect(calculator.add('//[abc][def]\n1abc2def3')).toBe(6);
    expect(calculator.add('//[xx][yy][zz]\n1xx2yy3zz4')).toBe(10);
  });
});