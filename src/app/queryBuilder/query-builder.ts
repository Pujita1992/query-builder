import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, from, of } from 'rxjs';
import { map, startWith, filter, pluck, findIndex } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { MatAutocompleteTrigger } from '@angular/material';

@Component({
  selector: 'query-builder',
  templateUrl: 'query-builder.html',
  styleUrls: ['query-builder.css'],
})
export class QueryBuilder implements OnInit {
  @ViewChild('search', {static: false}) search: ElementRef;

  constructor(private http: HttpClient) { }

  myControl = new FormControl();
  hiddenCtrl = new FormControl();

  private fieldList: SuggestionDetails = { Name: Action.Field, Value: [], Valid: ['string'] };
  private operatorList: SuggestionDetails = { Name: Action.Operator, Value: ['=', '!=', '>'], Valid: ['string'] };
  private valueList: SuggestionDetails = { Name: Action.Value, Value: [], Valid: ['string'] };
  private expressionList: SuggestionDetails = { Name: Action.Expression, Value: ['And', 'Or'], Valid: ['string'] };

  private operator: string[] = this.operatorList.Value;
  private value: string[] = this.valueList.Value;
  private expression: string[] = this.expressionList.Value;

  private get field(): string[] {
    return this.fieldList.Value;
  }

  filteredOptions: Observable<string[]>;
  private searchList: SelectedOption[] = [];

  private get selectionList(): SelectionDict[] {
    return [
      { Name: Action.Field, Value: this.field, NextSelection: Action.Operator },
      { Name: Action.Operator, Value: this.operator, NextSelection: Action.Value },
      { Name: Action.Value, Value: this.field, NextSelection: Action.Expression },
      { Name: Action.Expression, Value: this.expression, NextSelection: Action.Field }
    ];
  }

  private defaultSelection: string = Action.Field;
  private currentEvent: string;
  private currentValue: string
  private response: ApiResponse[] = [];

  ngOnInit() {
    this.fieldList
    this.getSearchObject();
    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value))
    );

  }


  getSearchObject(): void {
    // HTTP response
    var response = of([
      'Name',
      'Language',
      'Project Type'
    ]);

    response.subscribe(val => {
      this.fieldList.Value = val;
      this.myControl.setValue(''); // trigger the autocomplete to populate new values
    })
    
  }

  // autocomplete material ui events
  _filter(value: string): string[] {
    let lastSelection = this.searchList[this.searchList.length-1];
    if (lastSelection && lastSelection.Next === Action.Value) return [];
    let optionListToBePopulated: string[] = this.getOptionList();
    var searchText = this.getSearchText(value);
    return optionListToBePopulated.filter(option => option.toLowerCase().indexOf(searchText.toLowerCase().trim()) != -1);
  }

  selectionMade(event: Event, trigger: MatAutocompleteTrigger) {
    event.stopPropagation();
    trigger.openPanel();
  }

  displayFn(value: string): string {
    if (!!value) {
      this.searchList.push(new SelectedOption(value, this.currentEvent, this.getNextEvent(this.currentEvent)));
    }
    return this.searchList.length > 0 ? this.searchList.map(s => s.Value).join(' ') : '';
  }

  // private functions
  // ------------- Get Autocomplete List START --------------------
  private getOptionList(): string[] {
    if (this.searchList == null || this.searchList == undefined || this.searchList.length === 0) {
      this.currentEvent = this.defaultSelection;
      return this.field;
    }

    let lastElement: SelectedOption = <SelectedOption>this.searchList.slice(-1).pop();
    let currentList = this.selectionList.find(s => s.Name.toLowerCase() === lastElement.Next.toLowerCase());
    this.currentEvent = currentList ? currentList.Name : this.defaultSelection;
    return currentList ? this.getValues(currentList) : this.field;
  }

  private getValues(currentList: SelectionDict): string[] {
    if (this.currentEvent.toLowerCase() != 'value') return currentList.Value;
    return [];
  }
  // ------------- Get Autocomplete List END --------------------



  // --------------- START : Get the search text based on which the autocomplete will populate --------
  private getSearchText(value: string): string {
    if(this.currentEvent === Action.Expression) return '';
    var oldText = this.searchList.map(s => s.Value).join(' ');
    this.handleBackspace(value);
    return value.trim().replace(oldText, '');
  }

  private handleBackspace(searchValue: string): void {
    var oldText = this.searchList.map(s => s.Value).join(' ');
    var previousListName = this.searchList.length != 0 ? this.searchList[this.searchList.length - 1].PopulatedFrom : '';
    var prevList = this.selectionList.find(s => s.Name.toLowerCase() === previousListName.toLowerCase());
    var prevListValue = prevList ? prevList.Value : [];


    if (previousListName == Action.Value) {
      var lastField = this.getlastField();
      var lastFieldValue = lastField ? lastField.Value : '';
      var filteredResponse = this.response.find(r => r.DisplayName === lastFieldValue);
      prevListValue = filteredResponse ? filteredResponse.AutoCompleteValues : [];
    }

    if ((prevListValue ? prevListValue.indexOf(searchValue) === -1 : false) && oldText.trim().length > searchValue.trim().length)
      this.searchList.pop();
  }

  // --------------- END : Get the search text based on which the autocomplete will populate --------

  private getNextEvent(currentEvent: string): string {
    var currentList = this.selectionList.find(s => s.Name.toLowerCase() === currentEvent.toLowerCase());
    return currentList ? currentList.NextSelection : this.defaultSelection;
  }

  private getlastField(): SelectedOption | undefined {
    if (this.searchList.length === 0) return undefined;
    let i: number = this.searchList.length - 1;
    for (i; i >= 0; i--) {
      if (this.searchList[i].PopulatedFrom == Action.Field)
        return this.searchList[i];
    }
    return undefined;
  }

  private hasValueInSelectionList(queryString: string, index: number) {
    return this.selectionList[index].Value.some(val => val.toLowerCase() === queryString.toLowerCase());
  }

  onEnter(event: any):any {
    // event.stopPropagation();
    // event.preventDefault();
    // event.stopImmediatePropagation();
    const strList =  event.target.value.split(" ");
    const value = strList[strList.length - 1];
    this.currentEvent = Action.Value;
    this.displayFn(value);
  }
}

class SelectedOption {
  public Value: string;
  public PopulatedFrom: string;
  public Next: string;

  constructor(value: string, populatedFrom: string, next: string) {
    this.Value = value;
    this.PopulatedFrom = populatedFrom;
    this.Next = next;
  }
}

class SuggestionDetails {
  public Name: string;
  public Valid: string[];
  public Value: string[];
}

class SelectionDict {
  public Name: string;
  public Value: string[];
  public NextSelection: string;
}

// Server response
class ApiResponse {
  public DisplayName: string;
  public SearchType: string;
  public AutoCompleteValues: string[];
}

enum Action {
  Field = 'Field',
  Operator = 'Operator',
  Value = 'Value',
  Expression = 'Expression'
}
