class StringCalculator {
  add(numbers) {
    if (numbers === '') {
      return 0;
    }
    
    let delimiter = /[,\n]/;
    let numbersToProcess = numbers;
    
    if (numbers.startsWith('//')) {
      const delimiterEnd = numbers.indexOf('\n');
      const customDelimiter = numbers.substring(2, delimiterEnd);
      
      if (customDelimiter.includes('[')) {
        const delimiters = customDelimiter.match(/\[([^\]]+)\]/g);
        if (delimiters) {
          const delimiterPatterns = delimiters.map(d => 
            this.escapeRegExp(d.slice(1, -1))
          );
          delimiter = new RegExp(`[,\n]|${delimiterPatterns.join('|')}`, 'g');
        }
      } else {
        delimiter = new RegExp(`[,\n${this.escapeRegExp(customDelimiter)}]`);
      }
      
      numbersToProcess = numbers.substring(delimiterEnd + 1);
    }
    
    const numberArray = numbersToProcess.split(delimiter).map(n => parseInt(n, 10));
    
    const negatives = numberArray.filter(num => num < 0);
    if (negatives.length > 0) {
      throw new Error(`negatives not allowed: ${negatives.join(',')}`);
    }
    
    const filteredNumbers = numberArray.filter(num => num <= 1000);
    return filteredNumbers.reduce((sum, num) => sum + num, 0);
  }
  
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = StringCalculator;