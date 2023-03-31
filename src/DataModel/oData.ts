import { eContentType, FlowDisplayColumn, FlowObjectData, FlowObjectDataArray } from "flow-component-model";
import { oDataRow } from "./oDataRow";
import { oDataTreeNode } from "./oDataTreeNode";

// class to pass the data interpretation parameters to the underlying model
export class oDataConfig {
    // the last display column's developer name
    lastTreeColumn: string;
    
    // if the data is being delivered as a JSON string, this is the Flow value name containing it. 
    stringModelFieldName: string;

    // a copy of the component's configured display columns
    displayColumns: FlowDisplayColumn[];

    // a list of filters to apply to data
    filters: oDataConfigFilters;

    // a list of fieldDeveloperNames for which we will show a filter
    filterFields: Map<string,any[]>;

    constructor() {
        this.filters = new oDataConfigFilters(null);
        this.filterFields = new Map();
    }

    setFilterFields(flds: string) {
        let items: string[] = flds.split(",");
        items?.forEach((item: string) => {
            let i: string = item.trim();
            if(i.length > 0) {
                this.filterFields.set(i,[]);
                this.filters.filters.set(i,new oDataConfigFilter(i,null));
            }
        });
    }

    sortFilterFields() {
        this.filterFields.forEach((values: any[]) => {
            values = values.sort((a,b)=>{return a-b})
        });
    }
}

export class oDataConfigFilters {
    // a list of filters to apply to data
    filters: Map<string,oDataConfigFilter>;

    constructor(filters: FlowObjectDataArray) {
        this.filters = new Map();
        filters?.items?.forEach((item: FlowObjectData) => {
            this.filters.set(
                item.properties["developerName"].value as string,
                new oDataConfigFilter(
                    item.properties["developerName"].value as string,
                    item.properties["value"].value as string
                )
            );
        });
        //parse filters
    }

    rowMatches(row: oDataRow, colDefs: FlowDisplayColumn[]) : boolean {
        let matches: boolean = true;
        if(this.filters.size > 0) {
            this.filters.forEach((filter: oDataConfigFilter) => {
                if(filter.rowMatches(row, colDefs) === false) {
                    matches = false;
                }
            });
        }
        return matches;
    }

    // tests if the passed value matches the value set for the supplied developer name
    // used by filter combos to pre-select
    valMatches(developerName: string, value: any) : boolean {
        let matches: boolean = true;
        let filter = this.filters.get(developerName);
        if(filter){
            if(filter.value!==value){
                matches=false;
            }
        }
        return matches;
    }
}

export class oDataConfigFilter {
    developerName: string;
    value: any;

    constructor(developerName: string, value: any) {
        this.developerName = developerName;
        this.value = value;
    }

    rowMatches(row: oDataRow, colDefs: FlowDisplayColumn[]) : boolean {
        let matches: boolean = true;
        let colDef: FlowDisplayColumn;

        // we want this so we can cast the val for comparing
        colDefs.forEach((def: FlowDisplayColumn)=>{
            if(def.developerName===this.developerName) {
                colDef=def;
            }
        });

        if(colDef) {
            let val: any = row.all.get(colDef.developerName);
            if(this.value && this.value.length>0){
                let thisval: any;
                if(val && (val+"") === this.value) {
                    matches = true;
                }
                else {
                    matches = false;
                }
            }
        }
        return matches;
    }
}

// this class represents the data model.  It has the methods to parse, query and present the data for rendering
export class oData {
    
    config: oDataConfig;

    //the hierarchical tree, contains the label and id of node in treeNodes
    tree: Map<string,string>;

    //flat map of all nodes
    treeNodes: Map<string,oDataTreeNode>;
    
    // every row of data keyed on row id
    rows: Map<string,oDataRow>;

    // the unique row keys and a map of each real row using that key
    rowKeys: Map<string,Map<string,string>>;

    // unused but needed to overlap oDataTree
    dataRowId: string;
    carriesData: boolean;

    dataGridColumns: FlowDisplayColumn[];
    
    constructor(conf: oDataConfig) {
        this.config = conf;
        this.rows = new Map();
        this.tree = new Map();
        this.treeNodes = new Map();
        this.rowKeys = new Map();
        this.dataGridColumns = [];
        let inData: boolean = false;
        conf.displayColumns.forEach((col: FlowDisplayColumn) => {
            if(inData){
                this.dataGridColumns.push(col);
            }
            else {
                if(col.developerName===conf.lastTreeColumn) {
                    inData = true;
                }
            }
        });
    }

    public static parseString(data: string, conf: oDataConfig) : oData {
        let odata: oData = new oData(conf);
        let json: any[] = JSON.parse(data);
        if(json && json.length > 0){
            json.forEach((item: any) => {
                let row: oDataRow = oDataRow.parseObject(item, odata.config);
                odata.ingestRow(row);
            });
        }
        conf.sortFilterFields();
        odata.filterRows();
        return odata;
    }

    public static parseObjectDataArray(data: FlowObjectDataArray, conf: oDataConfig) : oData {
        let odata: oData = new oData(conf);
        if(data && data.items.length > 0){
            data.items.forEach((item: FlowObjectData) => {
                let row: oDataRow = oDataRow.parseObjectData(item, odata.config);
                odata.ingestRow(row);
            });
        }
        conf.sortFilterFields();
        odata.filterRows();
        return odata;
    }

    private ingestRow(row: oDataRow) {
        // add all possible filter values to filter map elements
        this.config.filterFields.forEach((values: any[], developerName: string) => {
            let rowVal: any = row.all.get(developerName);
            if(rowVal) {
                if(values.indexOf(rowVal) < 0) {
                    values.push(rowVal);
                }
            }
            
        });

        // add every row to the base map keyed on unique id
        this.rows.set(row.id, row);

        // build the map of row keys adding each row id to it child map
        if(!this.rowKeys.has(row.key)){
            this.rowKeys.set(row.key,new Map());
        }
        this.rowKeys.get(row.key).set(row.id, row.id);
       
        let node: oData | oDataTreeNode = this;
        let rowId: string="";
        row.tree.forEach((treeNode: string) => {
            if(rowId.length > 0) {
                rowId += "^^";
            }
            rowId += treeNode;
            if(!node.tree.has(treeNode)){
                let newNode : oDataTreeNode = new oDataTreeNode(treeNode,node);
                this.treeNodes.set(newNode.id,newNode);
                node.tree.set(treeNode, newNode.id);
                node = newNode;
                node.dataRowId = row.id;
                node.dataRowKey = rowId;
                node.carriesData = false;
            }
            else {
                node = this.treeNodes.get(node.tree.get(treeNode));
            }
            
        });
        // node now has lowest level in it, add the row
        node.dataRowId = row.id;
        node.carriesData = true;       
    }

    filterRows() {
        // iterate over rows, flagging them included
        this.rows.forEach((row: oDataRow) => {
            let include: boolean = this.config.filters.rowMatches(row, this.config.displayColumns);
            if(include === false) {
                //console.log("false")
            }
            row.include = include;
        });
        
    }

    // this will get all rows that match the key and summ all their data - this is used as the data row for the lowest tree level
    getSummaryRow(key: string) : oDataRow {
        let sum: oDataRow = new oDataRow();
        sum.key = key;
        sum.include = true;
        this.rows.values().next().value.cols.forEach((val: any, developerName: string) =>{
            sum.all.set(developerName,0);
        });
        //console.log(key);
        this.rowKeys.get(sum.key)?.forEach((rowId: string) => {
            let row: oDataRow = this.rows.get(rowId);
            if(row.include){
                row.cols.forEach((val: any, developerName: string) => {
                    if(sum.all.has(developerName)){
                        let curr: number = sum.all.get(developerName);
                        let add: number = parseFloat(row.all.get(developerName) || "0");
                        let tot: number = curr + add + Number.EPSILON;
                        let rnd: number = Number(tot.toFixed(2));
                        sum.all.set(developerName,rnd);
                    }
                    else {
                        let add: number = parseFloat(row.all.get(developerName) || "0");
                        let tot: number = add + Number.EPSILON;
                        let rnd: number = Number(tot.toFixed(2));
                        sum.all.set(developerName,rnd);
                    }
                });
            }
        });
        return sum;
    }

    // here we recieve a node key that lets us find a set of rows to add up
    getRollupRow(key: string) : oDataRow {
        let node: oDataTreeNode = this.treeNodes.get(key);
        return node.getRollupRow(this, this.dataGridColumns);
    }

    makeObjectData(rowId: string, developerName: string) : FlowObjectData {
        return this.rows.get(rowId).makeObjectData(developerName,this.config);
    }

    
}

