import { oData } from "./oData";

// this is the simple representation of a tree node
export class oDataTreeNode {
    // unique id
    id: string;

    // child elements
    tree: Map<string,string>;

    // ref to the node's parent
    parent: oData | oDataTreeNode;

    // the label of the node
    label: string;

    // the child row key
    dataRowId: string;

    constructor(label: string, parent: oData | oDataTreeNode) {
        this.tree = new Map();
        this.id = crypto.randomUUID();
        this.label = label;
        this.parent = parent;
        this.dataRowId = "";
    }
}