function quarterToCloseDate(year: number, quarter: string): Date {
  switch (quarter) {
    case 'Q1':
      return new Date(`${year}-03-31`);
    case 'Q2':
      return new Date(`${year}-06-30`);
    case 'Q3':
      return new Date(`${year}-09-30`);
    case 'Q4':
      return new Date(`${year}-12-31`);
    default:
      throw new Error('Invalid quarter');
  }
}
