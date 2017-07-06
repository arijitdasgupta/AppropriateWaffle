import * as Rx from 'rxjs';
import * as _ from 'lodash';

export const mapToObjectFromCsv = (stream:Rx.Observable<string>, propsToTake: string[]):Rx.Observable<any> => {
  const header = stream.take(1);
  const rows = stream.skip(1);

  return header.concatMap(csvHeadersRow => {
    const csvHeaders = csvHeadersRow.split(',');

    return rows.map(singleRowString => {
      const row  = singleRowString.split(',');
      const object = {};

      csvHeaders.forEach((headerItem, index) => {
        if (_.filter(propsToTake, _ => _ === headerItem).length > 0) {
            object[headerItem] = row[index];
        }       
      });

      return object;
    });
  });
};