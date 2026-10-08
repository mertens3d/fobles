we want a poc
add a simple button to the jump flyout out
when triggered it will

the larger goal is to get the dependancies on a sitecore item and provide a link graph for the authors/ devs to use. Add a readme in this folder for your notes and research.

get the selected item id in the tree. The code already does this so you can resuse that code.

then open in new tab
https://xmc-kestrafinan4e39-gettingstarfc3e-gettingstard1db.sitecorecloud.io/sitecore/shell/default.aspx?xmlcontrol=LayoutDetails&id=%7B110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9%7D&la=en&vs=1

where the id is the guid of the active item and the domain is the same as the active domain. Constructed something like
active domain + 
/sitecore/shell/default.aspx?xmlcontrol=LayoutDetails&id= +
item guid (it can have braces..it doesn't have to be encoded)
+ &la=en&vs=1

from that page select the final layout tab

src\rendering graph\example markup\Layout Details partial.html

harvest the data see below for data shape

select the edit button 

open
https://xmc-kestrafinan4e39-gettingstarfc3e-gettingstard1db.sitecorecloud.io/sitecore/shell/default.aspx?xmlcontrol=DeviceEditor&de=%7BFE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3%7D&id=%7B58291AE1-FF44-4172-BBB8-431FD7CA618A%7D&vs=1&la=en

where ID is the active item id
de is the device id. we can set to a const for now. Call it default

you may not have to go through the click on layout detail for final layout as it might already be there and just hidden

what happens is there is a form post with the __SOURCE value set to 
Shared Layout → Tabs_tab_0
Final Layout → Tabs_tab_1

It looks like 'edit' must be clicked in the correct tab in order to set the correct data in the back end

after the tab is activated and edit clicked, the form is submitted but i don't know how the data is stored. i can't find it in storage or view state. So just click it 
then open. 
https://xmc-kestrafinan4e39-gettingstarfc3e-gettingstard1db.sitecorecloud.io/sitecore/shell/default.aspx?xmlcontrol=DeviceEditor&de=%7BFE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3%7D&id=%7B58291AE1-FF44-4172-BBB8-431FD7CA618A%7D&vs=1&la=en

example page
src\rendering graph\example markup\device editor partial.html

havest the rendeirng data there (layout and controls)

data shape. not all will be populated right away
that will be in a type(s) form like. For now we will only be looking at the default device

iterate over the controls
select the control
for example 
<div id="C12057478981" style="padding:0;margin:0;border:0;position:relative;"><div id="R12057478980" style="background: rgb(208, 235, 246);" onclick="javascript:return scForm.postEvent(this,event,'OnRenderingClick(&amp;quot;0&amp;quot;)')" ondblclick="javascript:return scForm.postEvent(this,event,'device:edit')"><table border="0" cellpadding="0" cellspacing="0" width="100%">

select the "change" button
that opens an iframe
https://xmc-kestrafinan4e39-gettingstarfc3e-gettingstard1db.sitecorecloud.io/sitecore/shell/default.aspx?xmlcontrol=Sitecore.Shell.Applications.Dialogs.SelectRendering&hdl=385C4A95496C4116A0255F681F4260A8&ro=sitecore%3A%2F%2Fmaster%2F%7BEB2E4FFD-2761-4653-B052-26A64D385227%7D%3Flang%3Den%26ver%3D1&fo=sitecore%3A%2F%2Fmaster%2F%7BE82609B8-F10B-47FE-8D6D-785BB1FF49EB%7D%3Flang%3Den%26ver%3D1&ic=SoftwareV2%2F16x16%2Fcomponent_blue.png&txt=Select%20the%20rendering%20that%20you%20want%20to%20use.%20Click%20Select%20to%20continue.&ti=Select%20a%20Rendering&bt=Select&rt=Id&sop=1&str=1
I don't know if you have enough information to go to that directly

example html
src\rendering graph\example markup\select a rendering partial.html

from that we want the active item. in the example markup it should be 
Fobles Header

we want the name and guid
get from the associated treeivew id
Treeview_E82609B8F10B47FE8D6D785BB1FF49EB

back on device editor, select edit for each control
it opens another iframe 
https://xmc-kestrafinan4e39-gettingstarfc3e-gettingstard1db.sitecorecloud.io/sitecore/shell/applications/field%20editor.aspx?mo=mini&hdl=778A345C360448B3ABD64F364E747E69

once again it appears to be necassary to trigger the click on the item,  but after that you can just open the page in a different tab and the values will be the desired ones. That or traverse the iframes. Which is best

src\rendering graph\example markup\edit partial.html

from that markup we want things like
Variant (not Arden variant)
place holder
datasource
additional parameters


-------------
possible other approach
turn on raw values (I can do it ahead of time for POC) and get the data from the layout section 

src\rendering graph\example markup\layout section.html

actually...this might be the better way now that I think about it. Is all the same info there?
i think we can use the rendering item id to get the name of the rendering using content edit along with the fo query string.


you will likely have to do any data matching based on control name. Or possibly wait until the final step and just use that data



"device" :[
    "default" : {
        "layout" :{
            name : Sample layout
        }

        "controls" : [
            {
                name : Sample Layout
                
            },
            {
                name : Sample Inner SubLayout
                
            },
            etc.
        ]

    }

]