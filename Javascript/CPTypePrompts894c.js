$(document).ready(function () {
    $(".cpImageListNormal").hover(function () { $(this).addClass("cpImageListHover"); }, function () { $(this).removeClass("cpImageListHover"); });
    $("[id^=InkColor_default_Select_PMS_Input_]").keypress(function (event) {
        if (event.keyCode === 10 || event.keyCode === 13) event.preventDefault();
    });
    $("#DesignQuantity").keydown(function (event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            $("#UpdateButton").click();
        }
    });
    $("#ProductQuantity").keydown(function (event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            $("#UpdateButton").click();
        }
    });
});

/*
 * This file contains Javascript functions specific to the Custom Products pages.
 */

/*
 * The array of selection control IDs along with the javascript functions to
 * retrieve their values.
 */
var CPSelection_PromptControlValues = new Array();
/*
 * The ID of the hidden control whose value represents all of the user's selections.
 */
var CPSelection_ControlID;
/*
 * The ID of the hidden control that stores/posts the custom control's parameters (behaviorial
 * data).
 */
var CPSelection_ParameterID;
/*
 * The ID of the hidden control that stores/posts a value indicating why the prompt
 * selector is posting back.
 */
var CPSelection_EventSourceID;
/*
 * The string used to delimit prompt values.
 */
var CPSelection_PromptDelimiter;
/*
 * The name of the Flash movie window
 */
var CPDesign_FlashWindowName;
/*
 * The name of the hidden field used to post the design data.
 */
var CPDesign_FlashDesignFieldName;

// btn to cause partial post backs
var CPSelection_BtnSubmit;

var CPDesign_DesignInput;
/*
 * Initialize design integration data
 */

function CPDesign_Init(flashWindowName, flashDesignFieldName) {
    CPDesign_FlashWindowName = flashWindowName;
    CPDesign_FlashDesignFieldName = flashDesignFieldName;
}

function CPDesign_UnInit() {
    CPDesign_FlashWindowName = null;
    //CPDesign_FlashDesignFieldName = flashDesignFieldName;
}

/*
 * Return whether the designer integration has been initialized.
 */
function CPDesign_IsInitialized() {
    return CPDesign_FlashWindowName != null;
}

/*
 * CPSelection_ControlEntry is an object that is collected in CPSelection_PromptControlValues.
 */
function CPSelection_ControlEntry(controlID, valueFunction, validateFunction, parameterFunction) {
    this.controlID = controlID;
    this.valueFunction = valueFunction;
    this.validateFunction = validateFunction;
    this.parameterFunction = parameterFunction;
}
/*
 * Store the ID of the user selection control.
 */
function CPSelection_Init(controlID, promptDelimiter, parameterId, eventSourceId, btnId) {
    CPSelection_ControlID = controlID;
    CPSelection_PromptDelimiter = promptDelimiter;
    CPSelection_ParameterID = parameterId;
    CPSelection_EventSourceID = eventSourceId;
    CPSelection_BtnSubmit = btnId;

    CPSelection_PromptControlValues.length = 0;
}
/*
 * Add a control to this list of controls used for selecting CP prompts.
 */
function CPSelection_AddControl(controlID, valueFunction, validateFunction, parameterFunction) {
    var keyValue = new CPSelection_ControlEntry(controlID, valueFunction, validateFunction, parameterFunction);
    CPSelection_PromptControlValues.push(keyValue);
}
/*
 * Copy all selection values to the hidden field and submit the form.
 */
function CPSelection_Submit() {
    var isValid = CPSelection_FormatValueField();

    if (isValid) {
        var hidden = CPSelection_GetControlById(CPSelection_EventSourceID);
        hidden.value = 'c'; // Indicates value change.  For now, somewhat arbitrary value.
        var btnSubmit = CPSelection_GetControlById(CPSelection_BtnSubmit);
        btnSubmit.click();
    }
}
function CPSelection_FormatWithEdits() {
    if (CPSelection_ProcessEdits()) {
        CPSelection_FormatValueField();
        return true;
    }
    return false;
}
function CPSelection_ProcessEdits() {
    var isValid = true;
    for (var index = CPSelection_PromptControlValues.length - 1; index >= 0; --index) {
        var entry = CPSelection_PromptControlValues[index];

        if (entry.validateFunction != null) {
            if (!entry.validateFunction()) { // If this control requires validation & it's not valid, return false.
                isValid = false;
            }
        }
    }
    return isValid;
}
function CPSelection_FormatValueField() {
    //Throw up the processing windows in a common section of code
    var sPath = window.location.pathname;
    var sPage = sPath.substring(sPath.lastIndexOf('/') + 1);

    if (sPage.toLowerCase() == "customproductdesign") {
        DisplayLoading_Page();
    }

    // First, process quantity-based attributes
    CPSelect_SetMaxOrderQuantity();

    // Now, format the hidden prompt-selector value field with a delimited string of all prompt values.
    var allValues = '',
        allParameters = '';

    //alert(CPSelection_PromptControlValues.length);
    for (var index = 0; index < CPSelection_PromptControlValues.length; ++index) {
        var entry = CPSelection_PromptControlValues[index],
            parameterValue = '';

        if (entry.controlID != null && entry.controlID != "") {
            var value = entry.valueFunction(entry.controlID); // Retreive the value for this control

            if (entry.parameterFunction != null) {
                parameterValue = entry.parameterFunction(entry.controlID); // Retrieve this control's parameter value.
            }

            if (index == 0) {
                allValues = value;
                allParameters = parameterValue;
            }
            else {
                allValues += CPSelection_PromptDelimiter + value;
                allParameters += CPSelection_PromptDelimiter + parameterValue;
            }
        }

        else {
            break;
        }

    }
    var hidden = CPSelection_GetControlById(CPSelection_ControlID);
    hidden.value = allValues;

    var parameterField = CPSelection_GetControlById(CPSelection_ParameterID);
    parameterField.value = allParameters;

    if (CPDesign_IsInitialized()) {
        CPDesign_GetDesign();
    }

    return true;
}
function CPDesign_GetDesign() {
    var hiddenDesign = CPSelection_GetControlById(CPDesign_FlashDesignFieldName);

    hiddenDesign.value = getCustomizedXML();
}
function CPSelection_GetControlById(controlID) {
    var control = document.getElementById(controlID);
    if (control == null) {
        alert('Could not find control ' + controlID);
        return null;
    }
    return control;
}
function CPSelection_GetHiddenValue(controlID) {
    var control = document.getElementById(controlID);
    if (control == null) {
        alert('Could not find control ' + controlID);
        return null;
    }
    return control.value;
}
function CPSelection_ShowHelp(typeName, attributeName) {
    var helpWindow = window.open('/CustomProduct/CustomHelpPopup.aspx?CType=' + typeName + '&Prompt=' + attributeName,
        'CPHelpText',
        'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=no,width=410,height=415');
    helpWindow.focus();
}

/*
 * Dropdown Functions
 */
function CPDropdown_SubmitTable(control) {
    if (control.selectedIndex == 0) {
        control.selectedIndex = 1;
    }

    CPSelection_Submit();
}
/*
 * ColorGrid functions
 */

/*
 * Store a dictionary (array) keyed by prompt with the value being an
 * array (list) of tag IDs of category DIVs associated with the prompt.
 */
var ColorGrid_PromptCategories = new Array(),
    ColorGrid_ColorPrompts = new Object(), // Associative array
    ColorGrid_PromptSelections = new Object(); // Associative array
/*
 * This object represents an entry for one category.
 */
function ColorGrid_CategoryEntry(selectorID, categoryID) {
    this.selectorID = selectorID;
    this.categoryID = categoryID;
}
/*
 * This object represents one color selection.
 */
function ColorGrid_SelectionEntry(colorValue, isPmsInput, pmsInputRowID, pmsInputControlID) {
    this.colorValue = colorValue;
    this.isPmsInput = isPmsInput;
    this.pmsInputRowID = pmsInputRowID;
    this.pmsInputControlID = pmsInputControlID;

    this.getInputRow = function () {
        return CPSelection_GetControlById(this.pmsInputRowID);
    };

    this.getInputValue = function () {
        var control = CPSelection_GetControlById(this.pmsInputControlID);
        return control.value;
    };
}
/*
 * Return the array of selected value objects for the given prompt.
 */
function ColorGrid_GetSelections(prompt) {
    var selections = ColorGrid_PromptSelections[prompt];
    if (selections == null) {
        selections = new Array();
        ColorGrid_PromptSelections[prompt] = selections;
    }
    return selections;
}
/*
 * Add a new selected value to the selections for the given promp.
 */
function ColorGrid_AddSelection(prompt, colorValue, isPmsInput, pmsInputRowID, pmsInputControlID) {
    var selections = ColorGrid_GetSelections(prompt);
    selections.push(new ColorGrid_SelectionEntry(
        colorValue, isPmsInput, pmsInputRowID, pmsInputControlID));
}

function ColorGrid_ClearSelections(prompt) {
    var selections = ColorGrid_GetSelections(prompt),
        selectionLength = selections.length;
    for (var index = 0; index < selectionLength; ++index) {
        selections.pop();
    }
}
function ColorGrid_SetSelections(prompt, selections) {
    ColorGrid_PromptSelections[prompt] = selections;
}

/*
 * Return the selected value object corresponding to the PMS Input 
 * control with the given value.
 */
function ColorGrid_GetPmsSelection(prompt, colorValue) {
    var selections = ColorGrid_GetSelections(prompt);
    for (var selectionIndex = 0; selectionIndex < selections.length; ++selectionIndex) {
        var selection = selections[selectionIndex];
        if (selection.colorValue == colorValue) {
            return selection;
        }
    }
    return null;
}
/*
 * This object represents one color grid prompt's parameters.
 */
function ColorGrid_Prompt(numSelections,
    valueFieldID, selectionDivID, delimiter,
    selectText, selectNextText) {
    this.numSelections = numSelections;
    this.valueFieldID = valueFieldID;
    this.selectionDivID = selectionDivID;
    this.delimiter = delimiter;
    this.selectText = selectText;
    this.selectNextText = selectNextText;
}
/*
 * Initialize 1 color grid prompt's parameters.
 */
function ColorGrid_InitPrompt(attributeName, numSelections,
    valueFieldID, selectionDivID, delimiter,
    selectText, selectNextText, isPmsInput) {
    ColorGrid_ColorPrompts[attributeName] = new ColorGrid_Prompt(numSelections, valueFieldID,
        selectionDivID, delimiter, selectText, selectNextText, isPmsInput);

    if (ColorGrid_PromptSelections[attributeName] != null)
        ColorGrid_PromptSelections[attributeName].length = 0;
}
function ColorGrid_GetPrompt(attributeName) {
    return ColorGrid_ColorPrompts[attributeName];
}
/*
 * Return the prompt data associated with the value control with the given id.
 */
function ColorGrid_GetPromptNameByValueID(valueControlID) {
    for (var key in ColorGrid_ColorPrompts) {
        var promptData = ColorGrid_ColorPrompts[key];
        if (promptData.valueFieldID == valueControlID) {
            return key;
        }
    }
    return null;
}
/*
 * Process the click event for the category selector.
 */
function ColorGrid_OnCategoryClick(categoryControl, prompt, displayID) {
    var categoryTagIds = ColorGrid_PromptCategories[prompt];
    for (var index = 0; index < categoryTagIds.length; ++index) {
        var categoryTag = CPSelection_GetControlById(categoryTagIds[index].categoryID);
        categoryTag.style.display = 'none';
        var selectorTag = CPSelection_GetControlById(categoryTagIds[index].selectorID);
        selectorTag.className = 'cpColorListCategory';
        var tabImageCell = selectorTag.nextElementSibling;
        tabImageCell.style.background = 'url(/images/tab_right_off.gif)';
    }
    var displayTag = CPSelection_GetControlById(displayID);
    displayTag.style.display = 'block';
    categoryControl.className = 'cpColorListCategorySelected';
    var selectedTabImageCell = categoryControl.nextElementSibling;
    selectedTabImageCell.style.background = 'url(/images/tab_right_on.gif)';
}
/*
 * Load *ColorGrid_PromptCategories* for a category of colors associated with
 * a prompt.  This should be called for each category of each color
 * control on the page.
 */
function ColorGrid_LoadCategory(prompt, selectorID, categoryTagID) {
    var categoryTagIDs = ColorGrid_PromptCategories[prompt];
    if (categoryTagIDs == null) {
        categoryTagIDs = new Array();
        ColorGrid_PromptCategories[prompt] = categoryTagIDs;
    }
    var categoryEntry = new ColorGrid_CategoryEntry(selectorID, categoryTagID);
    categoryTagIDs.push(categoryEntry);
}

/*
 * Handle color selection.
 */
function ColorGrid_onClick(obj, colorName, colorText, attributeName, pmsInputRowID, pmsInputControlID) {
    var isPmsInput = (pmsInputRowID == null || pmsInputRowID == 'null' ? false : true),
        params = ColorGrid_GetPrompt(attributeName),
        oldValues = ColorGrid_GetSelections(attributeName),
        selectionDiv = CPSelection_GetControlById(params.selectionDivID), // line that lists selected colors
        selectionDivHTML = selectionDiv.innerHTML;

    if (obj.className == 'cpColorListColorSelected' && params.numSelections > 1) {
        oldValues = ColorGrid_UnselectTheSelected(attributeName, colorName);
        obj.className = 'cpColorListColor';
    } else if (obj.className == 'cpColorListColorSelected' && params.numSelections == 1) {
        return;
    }


    else {

        if (oldValues.length == params.numSelections && params.numSelections > 1) { // doesn't allow user to select, if maximum color(>1) selections are reached
            return;
        }
        else if (oldValues.length == params.numSelections && params.numSelections == 1) {
            ColorGrid_ClearSelections(attributeName);
            oldValues = ColorGrid_GetSelections(attributeName);
            ColorGrid_changeUnselected(obj); // unselect all
            selectionDivHTML = '';
        }

        if (oldValues.length == 0) { // If this is the first selection, just assign the value to the value field
            ColorGrid_AddSelection(attributeName, colorName, isPmsInput, pmsInputRowID, pmsInputControlID);
            ColorGrid_changeSelected(obj);
            selectionDivHTML = colorText;
        }
        else { // Otherwise, append the new selection
            ColorGrid_AddSelection(attributeName, colorName, isPmsInput, pmsInputRowID, pmsInputControlID);
            ColorGrid_changeSelected(obj);
        }

    }
    CPSelection_Submit();
}

/*
    If the object is already selected, remove it from the list if the user clicks again
*/
function ColorGrid_UnselectTheSelected(attributeName, colorName) {
    var oldvalues = ColorGrid_GetSelections(attributeName);
    for (var index = 0; index < oldvalues.length; ++index) {
        if (oldvalues[index].colorValue == colorName) {
            oldvalues.splice(index, 1);
            break;
        }
    }
    return oldvalues;
}

function ColorGrid_GetSelectionText(values, params) {
    var selectText = "";
    if (values.length == 0) {
        selectText = params.selectText;
    }
    else {
        for (var index = 0; index < values.length; ++index) {
            if (index > 0) {
                selectText += ", ";
            }
            selectText += values[index].colorValue;
        }
    }
    selectText += '; ' + params.selectNextText;
    return selectText;
}
/*
 * Unselect all colors for this control.
 */
function ColorGrid_changeUnselected(obj) {
    var tableObj = obj.parentNode.parentNode.parentNode,
        tableRows = tableObj.getElementsByTagName('tr');

    for (var rowIndex = 0; rowIndex < tableRows.length; ++rowIndex) {
        var rowObj = tableRows[rowIndex],
            rowCells = rowObj.getElementsByTagName('td');
        for (var cellIndex = 0; cellIndex < rowCells.length; ++cellIndex) {
            var cellObj = rowCells[cellIndex];
            if (cellObj.childNodes.length > 0 && cellObj.childNodes[0].nodeName.toUpperCase() == 'DIV') {
                cellObj.childNodes[0].className = 'cpColorListColor';
            }
        }
    }
}

function ColorGrid_ResetAll(obj, attributeName) {

    var tableObj = obj.parentNode.previousElementSibling.childNodes[1],
        tableRows = tableObj.getElementsByTagName('tr'),
        params = ColorGrid_GetPrompt(attributeName),
        oldValues = ColorGrid_GetSelections(attributeName),
        selectionDiv = CPSelection_GetControlById(params.selectionDivID), // line that lists selected colors
        selectionDivHTML = selectionDiv.innerHTML;

    // clear selections    
    ColorGrid_ClearSelections(attributeName);

    // Unselect all colors for this control
    for (var rowIndex = 0; rowIndex < tableRows.length; ++rowIndex) {
        var rowObj = tableRows[rowIndex],
            rowCells = rowObj.getElementsByTagName('td');
        for (var cellIndex = 0; cellIndex < rowCells.length; ++cellIndex) {
            var cellObj = rowCells[cellIndex];
            if (cellObj.childNodes.length > 0 && cellObj.childNodes[0].nodeName.toUpperCase() == 'DIV') {
                cellObj.childNodes[0].className = 'cpColorListColor';
            }
        }
    }
    selectionDivHTML = '';

    CPSelection_Submit();

}
function ColorGrid_OnCategoryOver(obj) {
    if (obj.className == 'cpColorListCategory') {
        obj.className = 'cpColorListCategoryHover';
    }
    else {
        obj.className = 'cpColorListCategorySelectedHover';
    }
}
function ColorGrid_OnCategoryOut(obj) {
    if (obj.className == 'cpColorListCategoryHover' || obj.className == 'cpColorListCategory') {
        obj.className = 'cpColorListCategory';
    }
    else {
        obj.className = 'cpColorListCategorySelected';
    }
}
/*
 * Select the given color table cell.
 */
function ColorGrid_changeSelected(obj) {
    obj.className = 'cpColorListColorSelected';
}

/*
 * Return the value given the controlID.
 */
function ColorGrid_getValue(controlID) {
    var attributeName = ColorGrid_GetPromptNameByValueID(controlID),
        prompt = ColorGrid_GetPrompt(attributeName),
        selections = ColorGrid_GetSelections(attributeName),
        pmsInputValues = '',
        value = '';
    for (var index = 0; index < selections.length; ++index) {
        var selection = selections[index],
            colorValue = selection.colorValue;
        if (index == 0) {
            value = colorValue;
        }
        else {
            value += prompt.delimiter + colorValue;
        }
        if (selection.isPmsInput) {
            var pmsValue = selection.getInputValue();
            if (pmsValue != null && pmsValue != '') {
                pmsInputValues += prompt.delimiter + pmsValue;
            }
        }
    }
    value += pmsInputValues;
    return value;
}
/*
 * Handle "blur" event for pantone input textbox.
 */
function ColorGrid_OnPmsInputBlur(prompt, colorValue, inputControl, pmsErrorRowID, autoSubmit) {
    ColorGrid_ValidatePantone(inputControl, pmsErrorRowID);
    //var selectionData = ColorGrid_GetPmsSelection(prompt, colorValue);
    ColorGrid_ProcessPantoneInputError(prompt, pmsErrorRowID);
    if (autoSubmit) {
        CPSelection_Submit();
    }
}

/*
 * Validate the value entered in the PMS input textbox.
 */
function ColorGrid_ValidatePantone(inputControl, pmsErrorRowID) {
    var pantoneValue = inputControl.value;
    if (pantoneValue != null && pantoneValue != '') {
        pantoneValue = pantoneValue.toUpperCase();
        pantoneValue = pantoneValue.replace(/^ +/, "");
        pantoneValue = pantoneValue.replace(/ +$/, "");
        pantoneValue = pantoneValue.replace(/[^0-9a-zA-Z ]+/g, "");
        if (pantoneValue.match(/^[0-9]+.*/) != null) {
            pantoneValue = 'PMS ' + pantoneValue;
        }
        else if (pantoneValue.match(/^PMS[0-9]+.*/) != null) {
            pantoneValue = 'PMS ' + pantoneValue.substring(3);
        }
        inputControl.value = pantoneValue;
    }
}
/*
 * Display an error message if any displayed PMS Input prompts are empty.
 */
function ColorGrid_ProcessPantoneInputError(prompt, pmsErrorRowID) {
    var pmsErrorRow = CPSelection_GetControlById(pmsErrorRowID),
        selectionData = ColorGrid_GetSelections(prompt),
        isError = false;
    for (var index = 0; index < selectionData.length; ++index) {
        var selection = selectionData[index];
        if (selection.isPmsInput) {
            var pmsValue = selection.getInputValue();
            if (pmsValue == null || pmsValue == '') {
                isError = true;
                break;
            }
        }
    }
    if (isError) {
        pmsErrorRow.style.visibility = "visible";
        CPSelection_SetErrorMsg(pmsErrorRow.innerHTML, false);
        $('#trPMSValueErrorText').show();
    }
    else {
        pmsErrorRow.style.visibility = "hidden";
        CPSelection_SetErrorMsgOff(pmsErrorRow.innerHTML, false);
        $('#trPMSValueErrorText').hide();
    }
}

/*
 * Dimensionable functions
 */

/*
 * Store a dictionary (array) keyed by dimension name with the value being a
 * list of all controls for that dimension.
 */
var Dimension_PageUnits = new Array();

function Dimension_UnitValues(controlID, minValue, maxValue, unit) {
    this.controlID = controlID;
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.unit = unit;
}
/*
 * Load one control for one dimension into *Dimension_PageUnits*.
 */
function Dimension_PreLoadUnit(dimension) {
    if (Dimension_PageUnits[dimension] != null) {
        Dimension_PageUnits[dimension].length = 0;
    }
}

function Dimension_LoadUnit(dimension, controlID, minValue, maxValue, unit) {
    var dimensionData = Dimension_PageUnits[dimension];
    if (dimensionData == null) {
        dimensionData = new Array();
        Dimension_PageUnits[dimension] = dimensionData;
    }

    dimensionData.push(new Dimension_UnitValues(controlID, minValue, maxValue, unit));
}
/*
 * Store the value of a dimension textbox control when it receives focus.
 */
function Dimension_OnFocus(dimension, userControl) {
    // Only store the value if it's displayed
    //var cellObj = userControl.parentNode;
    // Find the right unit entry for this dimension
    var dimensionUnit = Dimension_FindUnitData(dimension, userControl);
    if (dimensionUnit != null) {
        dimensionUnit.value = userControl.value;
    }
}
/*
 * Return the Dimension unit data corresponding to the given user control.
 */
function Dimension_FindUnitData(dimension, userControl) {
    var dimensionData = Dimension_PageUnits[dimension];
    if (dimensionData == null) {
        return null;
    }

    // Find the right unit entry for this dimension
    for (var index = 0; index < dimensionData.length; ++index) {
        if (dimensionData[index].controlID == userControl.id) {
            return dimensionData[index];
        }
    }
    return null;
}
/*
 * Perform value range checking.
 */
function Dimension_OnBlur(dimension, userControl, valueControlID, minValue, maxValue, errorSpanID, delimiter) {
    var returnValue = true,
        errorSpan = CPSelection_GetControlById(errorSpanID),
        dimensionData = Dimension_PageUnits[dimension];
    if (dimensionData == null) {
        errorSpan.innerHTML =
            'A page error occurred.  Could not find product dimension data for the dimension ' + dimension;
        return;
    }
    //var dimensionUnit = Dimension_FindUnitData(dimension, userControl);

    var controlValue = '';
    for (var controlIdIndex = 0; controlIdIndex < dimensionData.length; ++controlIdIndex) {
        if (controlIdIndex > 0) {
            controlValue += delimiter;
        }
        var cellControl = CPSelection_GetControlById(dimensionData[controlIdIndex].controlID); //userControl.form.elements.namedItem(dimensionData[controlIdIndex].controlID);
        controlValue += cellControl.value;
    }
    var valueControl = CPSelection_GetControlById(valueControlID);
    valueControl.value = controlValue;
    return returnValue;
}

function Dimension_isAllowedInput(e) {
    if (typeof e != 'undefined') {
        var key;

        if (window.event) {
            key = e.keyCode;
        }
        else if (e.keyCode) {
            key = e.keyCode;
            if (key == 8 || key == 9 || key == 17 || key == 37 || key == 39 || key == 46) {
                return true;
            }
        }
        else if (e.which) {
            key = e.which;
        }

        if (/[^0-9]/.test(String.fromCharCode(key))) {
            return false;
        }
    }
}
function Dimension_Validate(dimension, controlEntry, valueControlID, errorSpanID) {
    var errorSpan = CPSelection_GetControlById(errorSpanID),
        userControl = CPSelection_GetControlById(controlEntry),
        dimensionData = Dimension_PageUnits[dimension];
    if (dimensionData == null) {
        errorSpan.innerHTML =
            'A page error occurred.  Could not find product dimension data for the dimension ' + dimension;
        return;
    }

    var cellObj = userControl.parentNode;
    if (cellObj.style.display != 'none') {
        return Dimension_CheckRange(dimensionData, errorSpan);
    }

    return true;
}
/*
 * Edit each unit for the dimension.
 */
function Dimension_CheckRange(dimensionData, errorSpan) {
    errorSpan.innerHTML = '';
    var hasMaxBeenReached = false;
    for (var index = 0; index < dimensionData.length; ++index) {
        var entry = dimensionData[index],
            userControl = document.forms[0].elements.namedItem(entry.controlID),
            minValue = entry.minValue,
            maxValue = entry.maxValue,
            value = Number(userControl.value),
            unitLabel = entry.unit;
        if (hasMaxBeenReached) {
            if (isNaN(value)) {
                errorSpan.innerHTML = 'Please enter a valid number.';
                userControl.focus();
                return false;
            }
            if (value > minValue) {
                errorSpan.innerHTML = 'Please enter a value not greater than ' +
                    dimensionData[0].maxValue + ' ' + dimensionData[0].unit;
                userControl.focus();
                return false;
            }
        }
        else {
            if (isNaN(value)) {
                errorSpan.innerHTML = 'Please enter a valid number between ' + minValue + ' and ' + maxValue + ' ' + unitLabel;
                userControl.focus();
                return false;
            }
            if (maxValue > 1) { // don't perform this edit on fractions
                if (value < minValue) {
                    errorSpan.innerHTML = 'Please enter a value not less than ' + minValue + ' ' + unitLabel;
                    userControl.focus();
                    return false;
                }
                if (value > maxValue) {
                    errorSpan.innerHTML = 'Please enter a value not greater than ' + maxValue + ' ' + unitLabel;
                    userControl.focus();
                    return false;
                }
                // If this unit is exactly the max value, ensure the small dimension's value is zero.
                if (value == maxValue) {
                    hasMaxBeenReached = true;
                }
            }
        }
    }
    return true;
}
function Dimension_DataOnChange(dataControl, valueControlID, dimension, customValue) {
    var dimensionData = Dimension_PageUnits[dimension];
    if (dimensionData == null) {
        errorSpan.innerHTML =
            'A page error occurred.  Could not find product dimension data for the dimension ' + dimension;
        return;
    }

    if (dataControl.value == customValue) {
        Dimension_ShowCustom(dataControl, dimensionData);
    }
    else {
        Dimension_HideCustom(dataControl, dimensionData);
    }

    var valueControl = CPSelection_GetControlById(valueControlID),
        firstUserControl = dataControl.form.elements.namedItem(dimensionData[0].controlID);
    if (firstUserControl.type.toLowerCase() == 'text') {
        if (dataControl.value == customValue) {
            firstUserControl.value = dimensionData[0].minValue;
            valueControl.value = dimensionData[0].minValue;
        }
        else {
            firstUserControl.value = dataControl.value;
            valueControl.value = dataControl.value;
        }
    }
    else if (firstUserControl.type.toLowerCase() == 'select') {
        firstUserControl.selectedIndex = 0;
        valueControl.value = dataControl.value;
    }
    CPSelection_Submit();
}
function Dimension_ShowCustom(dataControl, dimensionData) {
    Dimension_SetCustomDisplay(dataControl, dimensionData, 'visible');
}
function Dimension_HideCustom(dataControl, dimensionData) {
    Dimension_SetCustomDisplay(dataControl, dimensionData, 'hidden');
}
function Dimension_SetCustomDisplay(dataControl, dimensionData, displayType) {
    var tableRow = dataControl.parentNode.parentNode,
        rangeRow = tableRow.parentNode.getElementsByTagName('tr')[1],
        tableCells = tableRow.getElementsByTagName('td'),
        rangeCells = rangeRow.getElementsByTagName('td');
    for (var index = 0; index < dimensionData.length; ++index) {
        var cellObj = tableCells[1 + index];
        cellObj.style.visiblity = displayType;
        var lowerCellObj = rangeCells[1 + index];
        lowerCellObj.style.visiblity = displayType;
        dimensionData[index].isCustomValue = (displayType == 'visible');
    }
}

function CPSelect_GetValue(control) {
    if (control.nodeName.toLowerCase() == 'select') {
        return CPSelect_GetListboxValue(control.id);
    }
    else if (control.type.toLowerCase() == 'radio') {
        return CPSelect_GetRadioValue(control.id);
    }
    else {
        return control.value;
    }
}
function CPSelect_SetValue(control, value) {
    if (control.nodeName.toLowerCase() == 'select') {
        return CPSelect_SetListboxValue(control.id, value);
    }
    else if (control.type.toLowerCase() == 'radio') {
        return CPSelect_SetRadioValue(control.id, value);
    }
    else {
        control.value = value;
    }
}
/*
 * Return the value given the controlID.
 */
function Dimension_GetValue(controlID) {
    var control = CPSelection_GetControlById(controlID);
    return control.value;
}

function CPSelect_GetListboxValue(controlID) {
    var control = document.getElementById(controlID);

    return control.options[control.selectedIndex].value;
}
function CPSelect_SetListboxValue(controlID, value) {
    var control = document.getElementById(controlID);
    for (var index = 0; index < control.options.length; ++index) {
        if (control.options[index].value == value) {
            control.options[index].selected = true;
        }
    }
}

/*
 * Radio button functions
 */
function CPSelect_GetRadioValue(controlID) {
    var control = CPSelection_GetControlById(controlID),
        controlName = control.name,
        form = control.form,
        formButtons = form[controlName].length;
    if (formButtons == null) { // Null if there's only 1 button -- it's not an array at that point
        return form[controlName].value;
    }
    for (var index = 0; index < formButtons; ++index) {
        var button = form[controlName][index];
        if (button.checked) {
            return button.value;
        }
    }
    return '';
}
function CPSelect_SetRadioValue(controlID, value) {
    var control = CPSelection_GetControlById(controlID),
        controlName = control.name,
        form = control.form,
        numButtons = form[controlName].length;
    for (var index = 0; index < numButtons; ++index) {
        var button = form[controlName][index];
        if (button.value == value) {
            button.checked = true;
        }
    }
}
/*
 * CheckBoxGroup functions
 */
var CPSelect_CheckGroupPrompts = new Object(), // Associative array
    CPSelect_CheckGroupSelections = new Object(), // Associative array
    CPSelect_CheckGroupToggleState_Collapse = 'C',
    CPSelect_CheckGroupToggleState_Expand = 'E';

function CPSelect_CheckGroupPrompt(attributeName, valueFieldID, toggleImageID, ruleID, controlRegionID, expandState) {
    this.attributeName = attributeName;
    this.valueFieldID = valueFieldID;
    this.toggleImageID = toggleImageID;
    this.ruleID = ruleID;
    this.controlRegionID = controlRegionID;
    this.expandState = expandState;
}

function CPSelect_InitCheckGroupPrompt(attributeName, valueFieldID, toggleImageID, ruleID, controlRegionID, expandState) {

    if (CPSelect_CheckGroupSelections[attributeName] != null)
        CPSelect_CheckGroupSelections[attributeName].length = 0;

    CPSelect_CheckGroupPrompts[attributeName] = new CPSelect_CheckGroupPrompt(
        attributeName, valueFieldID, toggleImageID, ruleID, controlRegionID, expandState);
}
function CPSelect_GetCheckGroupPrompt(attributeName) {
    return CPSelect_CheckGroupPrompts[attributeName];
}
function CPSelect_GroupCheckGroupPromptByValueID(valueControlID) {
    for (var key in CPSelect_CheckGroupPrompts) {
        var promptData = CPSelect_CheckGroupPrompts[key];
        if (promptData.valueFieldID == valueControlID) {
            return key;
        }
    }
    return null;
}

function CPSelect_CheckGroupEntry(value) {
    this.value = value;
}

function CPSelect_AddCheckGroupSelection(prompt, value) {
    var selections = CPSelect_GetCheckGroupSelections(prompt);
    selections.push(new CPSelect_CheckGroupEntry(value));
}

function CPSelect_RemoveCheckGroupSelection(prompt, value) {
    var selections = CPSelect_GetCheckGroupSelections(prompt);
    for (var index = 0; index < selections.length; ++index) {
        var selection = selections[index];
        if (selection.value == value) {
            selections.splice(index, 1);
            break;
        }
    }
}

function CPSelect_CheckGroupOnClick(obj, promptValue, attributeName) {
    //var selections = CPSelect_GetCheckGroupSelections(attributeName);
    if (obj.checked) {
        CPSelect_AddCheckGroupSelection(attributeName, promptValue);
    }
    else {
        CPSelect_RemoveCheckGroupSelection(attributeName, promptValue);
    }

    CPSelection_Submit();
}

/*
 * Return the array of selected value objects for the given prompt.
 */
function CPSelect_GetCheckGroupSelections(prompt) {
    var selections = CPSelect_CheckGroupSelections[prompt];
    if (selections == null) {
        selections = new Array();
        CPSelect_CheckGroupSelections[prompt] = selections;
    }
    return selections;
}

function CPSelect_GetCheckGroupValue(controlID) {
    var attributeName = CPSelect_GroupCheckGroupPromptByValueID(controlID),
        selections = CPSelect_GetCheckGroupSelections(attributeName),
        value = '';
    for (var index = 0; index < selections.length; ++index) {
        var selection = selections[index],
            optionValue = selection.value;
        if (index == 0) {
            value = optionValue;
        }
        else {
            value += '~' + optionValue;
        }
    }
    return value;
}

function CPSelect_CheckGroupToggle(controlID) {
    var attributeName = CPSelect_GroupCheckGroupPromptByValueID(controlID),
        promptData = CPSelect_GetCheckGroupPrompt(attributeName),

        ruleDisplayValue = '',
        controlRegionDisplayValue = '',
        toggleImage = CPSelection_GetControlById(promptData.toggleImageID);

    if (promptData.expandState.toUpperCase() == CPSelect_CheckGroupToggleState_Collapse) {
        ruleDisplayValue = 'none';
        promptData.expandState = CPSelect_CheckGroupToggleState_Expand;
        toggleImage.src = '/images/en-us/customproduct/minuscollapse.gif';
    }
    else {
        controlRegionDisplayValue = 'none';
        promptData.expandState = CPSelect_CheckGroupToggleState_Collapse;
        toggleImage.src = '/images/en-us/customproduct/plusexpand.gif';
    }
    var ruleControl = CPSelection_GetControlById(promptData.ruleID);
    ruleControl.style.display = ruleDisplayValue;

    var controlRegionControl = CPSelection_GetControlById(promptData.controlRegionID);
    controlRegionControl.style.display = controlRegionDisplayValue;
}

function CPSelect_CheckGroupGetParameter(controlID) {
    var attributeName = CPSelect_GroupCheckGroupPromptByValueID(controlID),
        promptData = CPSelect_GetCheckGroupPrompt(attributeName);
    return promptData.expandState;
}
/*
 * Image functions
 */
function CPSelect_ImageOnClick(controlID, displayName, value, delimiter) {
    var control = CPSelection_GetControlById(controlID);
    control.value = value;
    CPSelection_Submit();
}

/*
 * Designer internal prompt integration...
 */
function CPDesign_HasSequence(value) {
    var hiddenControl = document.getElementById('ConsecutiveNumbering');
    if (hiddenControl != null) {
        if (value == true) {
            hiddenControl.value = 'Yes';
        }
        else {
            hiddenControl.value = 'No';
        }
    }
}

function CPDesign_HasBothSidesSame(value) {
    var hiddenControl = document.getElementById('BothSidesSame');
    if (hiddenControl != null) {
        if (value == true) {
            hiddenControl.value = 'Yes';
        }
        else {
            hiddenControl.value = 'No';
        }
    }
}

/*
 * Handle design interface for text-length based charges.  CPDesign_CopyBreaks holds 
 * each charge break length.
 */
var CPDesign_CopyBreaks = new Array();
function CPDesign_CopyBreak(value, messageID) {
    this.value = value;
    this.messageID = messageID;
}
function CPDesign_AddCopyBreak(value, messageID) {
    CPDesign_CopyBreaks.push(new CPDesign_CopyBreak(value, messageID));
}
/*
 * The designer calls CPDesign_SetMaxCopyLength with the pixel length of the longest text line.
 */
function CPDesign_SetMaxCopyLength(length) {
    var lengthControl = document.getElementById('MaxCopyLengthPixels');
    if (lengthControl != null) {
        var foundIndex = 0;
        if (length > 0) {
            foundIndex = CPDesign_CopyBreaks.length - 1;
            for (var index = 0; index < CPDesign_CopyBreaks.length; ++index) {
                if (length < CPDesign_CopyBreaks[index].value) {
                    foundIndex = index - 1;
                    break;
                }
            }
        }
        lengthControl.value = CPDesign_CopyBreaks[foundIndex].value;
        CPDesign_InitCopyBreakMessage();
    }
}
/* 
 * Display the proper message for the current copy length break.
 */
function CPDesign_InitCopyBreakMessage() {
    var lengthControl = document.getElementById('MaxCopyLengthPixels');
    if (lengthControl != null) {
        var lengthValue = lengthControl.value;
        for (var index = 0; index < CPDesign_CopyBreaks.length; ++index) {
            if (CPDesign_CopyBreaks[index].messageID != null) {
                var currentBreak = CPDesign_CopyBreaks[index],
                    messageElement = document.getElementById(currentBreak.messageID);
                if (lengthValue == currentBreak.value) {
                    messageElement.style.display = '';
                    CPSelection_SetErrorMsg(document.getElementById(CPDesign_CopyBreaks[index].messageID).innerHTML, false);
                }
                else {
                    messageElement.style.display = 'none';
                    CPSelection_SetErrorMsgOff(document.getElementById(CPDesign_CopyBreaks[index].messageID).innerHTML, false);
                }
            }
        }
    }
}
/*
 * Handle interface for Quantity based rules.  CPSelect_QuantityBreaks holds 
 * each quantity break (description for attribute data).
 */
var CPSelect_QuantityBreaks = new Array();
function CPSelect_AddQuantityBreak(value) {
    CPSelect_QuantityBreaks.push(value);
}
var CPSelect_QuantityControlID = null,
    CPSelect_UMQuantity = 1,
    CPSelect_ConvFactor = 1;
function CPSelect_InitQuantityControl(quantityControlID, umQuantity, convFactor) {
    CPSelect_QuantityControlID = quantityControlID;
    if (umQuantity != null) {
        CPSelect_UMQuantity = umQuantity;
    }
    if (convFactor != null) {
        CPSelect_ConvFactor = convFactor;
    }
}
/*
 * CPSelect_FormatValueField calls CPSelect_SetMaxOrderQuantity() every time the value for 
 * TypePromptSelector is formatted.
 */
function CPSelect_SetMaxOrderQuantity() {
    var quantityBreakControl = document.getElementById('MaxOrderQuantity'),
        quantityControl = document.getElementById(CPSelect_QuantityControlID);
    if (quantityBreakControl != null && quantityControl != null) {
        var enteredQuantity = quantityControl.value,
            foundIndex = 0;
        if (enteredQuantity > 0) {
            enteredQuantity *= CPSelect_UMQuantity / CPSelect_ConvFactor;
            foundIndex = CPSelect_QuantityBreaks.length - 1;
            for (var index = 0; index < CPSelect_QuantityBreaks.length; ++index) {
                if (enteredQuantity < CPSelect_QuantityBreaks[index]) {
                    foundIndex = index - 1;
                    break;
                }
            }
        }
        quantityBreakControl.value = CPSelect_QuantityBreaks[foundIndex];
    }
}
/*
 * Handle interface for Price based rules.  CPSelect_DollarBreaks holds 
 * each price break for price (dollar) driven prompts.  This is *not* the
 * normal notion of price breaks.  This is for selecting prompts when the
 * price exceeds a threshold.
 */
var CPSelect_DollarBreaks = new Array();
function CPSelect_AddDollarBreak(value) {
    CPSelect_DollarBreaks.push(value);
}
var CPSelect_Price = 0.0;
function CPSelect_InitDollarControl(price) {
    CPSelect_Price = price;
}
/*
 * CPSelect_FormatValueField calls CPSelect_SetMaxOrderDollars() every time the value for 
 * TypePromptSelector is formatted.
 */
function CPSelect_SetMaxOrderDollars() {
    var dollarBreakControl = document.getElementById('MaxOrderDollars'),
        dollarControl = document.getElementById(CPSelect_PriceControlID);
    if (dollarBreakControl != null && dollarControl != null) {
        var enteredDollars = dollarControl.value,
            foundIndex = 0;
        if (enteredDollars > 0) {
            foundIndex = CPSelect_DollarBreaks.length - 1;
            for (var index = 0; index < CPSelect_DollarBreaks.length; ++index) {
                if (enteredDollars < CPSelect_DollarBreaks[index]) {
                    foundIndex = index - 1;
                    break;
                }
            }
        }
        dollarBreakControl.value = CPSelect_DollarBreaks[foundIndex];
    }
}
var CPSelect_HasArtworkControlID = null;
function CPSelect_SetHasArtworkParameters(hasArtworkControlID) {
    CPSelect_HasArtworkControlID = hasArtworkControlID;
}
function CPSelect_SetHasArtwork() {
    if (CPSelect_HasArtworkControlID != null) {
        var hasArtworkControl = document.getElementById(CPSelect_HasArtworkControlID);
        if (hasArtworkControl != null) {
            if (hasArtworkControl.type && hasArtworkControl.type == "radio") {
                CPSelect_SetRadioValue(CPSelect_HasArtworkControlID, 'Yes');
            }
            else {
                hasArtworkControl.value = 'Yes';
            }
        }
    }
}
/*
 * The design page calls CPDesign_SetInks to set the actual inks used.  If the
 * user does not use all inks originally required, this function
 * adjusts the NumInks prompt to the lower number and selects only the ink colors
 * used by the designer.  The ink colors are passed as a tab delimited list because
 * the designer's interface to javascript (ActionScript) does not support arrays well.
 */
var CPDesign_NumInksControlID,
    CPDesign_InkControlID;
function CPDesign_InitInks(inksControlID, numInksControlID) {
    CPDesign_InkControlID = inksControlID;
    CPDesign_NumInksControlID = numInksControlID;
}
/*
 * CPDesign_SetInks is called by the designer to set the actual inks used by 
 * the designer.  This is a tab-delimited list.  This list is either equal to or
 * it is a subset of the inks selected by the Ink Color prompt.
 */
function CPDesign_SetInks(delimitedInkIndexes) {
    var inkIndexes = delimitedInkIndexes.split("\t"),
        numInks = inkIndexes.length;
    if (CPDesign_NumInksControlID != null) {
        var numInksControl = CPSelection_GetControlById(CPDesign_NumInksControlID);
        CPSelect_SetValue(numInksControl, numInks);
    }
    var attributeName = ColorGrid_GetPromptNameByValueID(CPDesign_InkControlID),
        //prompt = ColorGrid_GetPrompt(attributeName),
        selections = ColorGrid_GetSelections(attributeName),
        newSelections = new Array();
    for (var selectionIndex in inkIndexes) {
        newSelections.push(selections[inkIndexes[selectionIndex]]);
    }
    ColorGrid_SetSelections(attributeName, newSelections);
}
/*
 * Return the number of inks.  This only works on the Design page.
 */
function CPDesign_GetNumInks() {
    if (CPDesign_NumInksControlID != null) {
        var numInksControl = CPSelection_GetControlById(CPDesign_NumInksControlID);
        return CPSelect_GetValue(numInksControl);
    }
}
/*
* The design page calls CPDesign_SetNumSides to set the number of sides
* actually designed by the user.  This is done if the users selects two
* sides, designs one, and confirms that they only really wanted one.
*/
var CPDesign_NumSidesControlID = null;
function CPDesign_InitSides(numSidesControlID) {
    CPDesign_NumSidesControlID = numSidesControlID;
}
function CPDesign_SetNumSides(numSides) {
    if (CPDesign_NumSidesControlID != null) {
        var numSidesControl = CPSelection_GetControlById(CPDesign_NumSidesControlID);
        CPSelect_SetValue(numSidesControl, numSides);
    }
}
/*
* Return the number of sides selected.
*/
function CPDesign_GetNumSides() {
    if (CPDesign_NumSidesControlID != null) {
        var numSidesControl = CPSelection_GetControlById(CPDesign_NumSidesControlID);
        return CPSelect_GetValue(numSidesControl);
    }
}
/*
* The designer calls CPOpenPrintDesign with the CID to open the Print Desing popup.
*/
function CPOpenPrintDesign(cid) {

    var url = "/CustomProduct/CustomProductViewer?CID=" + cid + "&PopUp=Y";
    var win = window.open(url, "_blank", "scrollbars=1,width=700,height=700");
    if (win == null) {
        alert("Please disable pop-up blocking to display print window.");
    }
    return false;

}


var CPSelection_DoesPageDisplayLoading = false,
    CPSelection_HasPageLoaded = false,
    CPSelection_DoesFlashDisplayLoading = false,
    CPSelection_HasFlashLoaded = false;

function CPSelection_PageDisplaysLoading(doesDisplay) {
    CPSelection_DoesPageDisplayLoading = doesDisplay;
}

function CPSelection_FlashDisplaysLoading(doesDisplay) {
    CPSelection_DoesFlashDisplayLoading = doesDisplay;
}

function HideLoading() /* _Flash */ {
    CPSelection_HasFlashLoaded = true;
    if (CPSelection_HasPageLoaded || !CPSelection_DoesPageDisplayLoading) {
        HideLoadingImpl();
    }
}

function HideLoading_Page() {
    CPSelection_HasPageLoaded = true;
    if (CPSelection_HasFlashLoaded || !CPSelection_DoesFlashDisplayLoading) {
        HideLoadingImpl();
    }
}

function DisplayLoading_Page() {
    CPSelection_PageDisplaysLoading(true);
    DisplayLoadingWindow();
}

function DisplayLoading() {
    CPSelection_FlashDisplaysLoading(true);
    DisplayLoadingWindow();
}

/* Hide modal progress window */
function HideLoadingImpl() {
    HideLoadingWindow();
    ControlSELECTItems("");
}

var clickCnt = 0;
function checkHide(oEvent) {
    if (oEvent.ctrlKey && oEvent.shiftKey && oEvent.altKey) {
        clickCnt++;
    }

    if (clickCnt >= 5) {
        HideLoadingWindow();
        CPIsReadOnly = false;
        clickCnt = 0;
    }
}

var CPSelection_ItemNumber = null,
    CPSelection_Quantity = null,
    CPSelection_ErrorMsg = '',
    CPSelection_UserCPRole = null;

function CPSelection_SetItemNumber(itemNumber) {
    CPSelection_ItemNumber = itemNumber;
}

///The skipUrlModification is the parameter that is being added so that JOE would call the method
///and we would return the value instead of calling CPSelection_SetJavaVariable
///This is to avoid issues with JOE while migrating to Chrome which considers the URL modification
///as ipc flooding and would block the url modification altogether causing the designer to stop working
///with JOE
function CPSelection_GetErrorMsg(skipUrlModification) {
    if (skipUrlModification === true || skipUrlModification === "TRUE" || skipUrlModification === "true")
        return CPSelection_ErrorMsg;

    CPSelection_SetJavaVariable(CPSelection_ErrorMsg);
}

function CPSelection_SetErrorMsg(errMsg, override) {
    if (CPSelection_ErrorMsg == null || CPSelection_ErrorMsg == '' || override == true) {
        CPSelection_ErrorMsg = errMsg;
        CPSelection_NotifyCSR();
    }
}

function CPSelection_SetErrorMsgOff(errMsg, override) {
    if (CPSelection_ErrorMsg == errMsg || override == true) {
        CPSelection_ErrorMsg = '';
        CPSelection_NotifyCSR();
    }
}

///The skipUrlModification is the parameter that is being added so that JOE would call the method
///and we would return the value instead of calling CPSelection_SetJavaVariable
///This is to avoid issues with JOE while migrating to Chrome which considers the URL modification
///as ipc flooding and would block the url modification altogether causing the designer to stop working
///with JOE
function CPSelection_GetItemNumber(skipUrlModification) {
    if (skipUrlModification === true || skipUrlModification === "TRUE" || skipUrlModification === "true")
        return CPSelection_ItemNumber;

    CPSelection_SetJavaVariable(CPSelection_ItemNumber);
}

function CPSelection_SetQuantity(quantity) {
    CPSelection_Quantity = quantity;
}

///The skipUrlModification is the parameter that is being added so that JOE would call the method
///and we would return the value instead of calling CPSelection_SetJavaVariable
///This is to avoid issues with JOE while migrating to Chrome which considers the URL modification
///as ipc flooding and would block the url modification altogether causing the designer to stop working
///with JOE
function CPSelection_GetQuantity(skipUrlModification) {
    if (skipUrlModification === true || skipUrlModification === "TRUE" || skipUrlModification === "true")
        return CPSelection_Quantity;

    CPSelection_SetJavaVariable(CPSelection_Quantity);
}

function CPSelection_SetJavaVariable(value) {
    window.location = window.location.href.split('#')[0] + "#" + value;
}

function CPSelection_ScaleImage(imageObj, width, height) {
    if (imageObj.scrollHeight > height) { imageObj.style.height = height; }

    if (imageObj.scrollWidth > width) { imageObj.style.width = width; imageObj.style.height = null; }
}

function CPDesign_ScrollImage(imageId, panelId) {

    var image = document.getElementById(imageId),

        panel = document.getElementById(panelId);

    if (parseInt(image.scrollWidth) > 700) {
        panel.className += "CPConfirmScollImage";
    }
}

function CPSelection_SetUserCPRole(role) {
    CPSelection_UserCPRole = role;
}

function CPSelection_NotifyCSR() {
    if (CPSelection_UserCPRole != null && CPSelection_UserCPRole == "CSR") {
        //Notify JOE that the errmsg has changed
        document.title = "Done";
    }
}

var CPSelection_DesignCountControlID,
    CPSelection_DesignCountStoredValue;


function CPSelection_RegisterDesignCount(controlID, storedValue) {
    CPSelection_DesignCountControlID = controlID;
    CPSelection_DesignCountStoredValue = storedValue;
}

///The skipUrlModification is the parameter that is being added so that JOE would call the method
///and we would return the value instead of calling CPSelection_SetJavaVariable
///This is to avoid issues with JOE while migrating to Chrome which considers the URL modification
///as ipc flooding and would block the url modification altogether causing the designer to stop working
///with JOE
function CPSelection_GetDesignCount(skipUrlModification) {
    var designCount;
    if (CPSelection_DesignCountStoredValue != null) {
        designCount = CPSelection_DesignCountStoredValue;
    }
    else {
        if (CPSelection_DesignCountControlID != null) {
            var designCountControl = document.getElementById(CPSelection_DesignCountControlID);
            if (designCountControl != null) {
                designCount = designCountControl.value;
            }
            else {
                designCount = 1;
            }
        }
        else {
            designCount = 1;
        }
    }

    if (skipUrlModification === true || skipUrlModification === "TRUE" || skipUrlModification === "true")
        return designCount;

    CPSelection_SetJavaVariable(designCount);

}
