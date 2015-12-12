
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Lang = imports.lang;
const MessagesIndicator = imports.ui.dateMenu.MessagesIndicator;
const IndicatorPad = imports.ui.dateMenu.IndicatorPad;
const Urgency = imports.ui.messageTray.Urgency;

const MessageCounterIndicator = new Lang.Class({
    /*
     * See also ui.dateMenu.MessagesIndicator
     */
    Name: 'MessageCounterIndicator',

    _init: function() {
        this.actor = new St.Label({ text: '➓', visible: false, y_expand: true,
                                    y_align: Clutter.ActorAlign.CENTER,
                                    style_class: 'count-label'});

        this._sources = [];

        Main.messageTray.connect('source-added', Lang.bind(this, this._onSourceAdded));
        Main.messageTray.connect('source-removed', Lang.bind(this, this._onSourceRemoved));
        Main.messageTray.connect('queue-changed', Lang.bind(this, this._updateCount));

        let sources = Main.messageTray.getSources();
        sources.forEach(Lang.bind(this, function(source) { this._onSourceAdded(null, source); }));
    },

    _onSourceAdded: function(tray, source) {
        source.connect('count-updated', Lang.bind(this, this._updateCount));
        this._sources.push(source);
        this._updateCount();
    },

    _onSourceRemoved: function(tray, source) {
        this._sources.splice(this._sources.indexOf(source), 1);
        this._updateCount();
    },

    _updateCount: function() {
        let count = 0;
        let label;
        this._sources.forEach(Lang.bind(this,
            function(source) {
                for (let i=0; i < source.notifications.length; i++) {
                    let notification = source.notifications[i];
                    if (notification.urgency >= Urgency.NORMAL) {
                        // increment counter
                        count++;
                    }
                }
            }));

        if (count > 10) {
            // Limit count
            count = 10;
        }

        // Create unicode character based on count (➊ .. ➓)
        label = String.fromCharCode(0x2789 + count)
        this.actor.text = label;

        this.actor.visible = (count > 0);

    }
});


let count_indicator, orig_indicator, dateMenu;

function init() {
}

function enable() {

    dateMenu = Main.panel.statusArea.dateMenu;
    let dateMenuLayout = dateMenu.actor.get_children()[0];
    let actors = dateMenuLayout.get_children();

    orig_indicator = dateMenu._indicator;

    // Remove original indicator
    dateMenuLayout.remove_actor(orig_indicator.actor);
    //orig_indicator.actor.destroy();

    // Remove IndicatorPad padding
    dateMenuLayout.remove_actor(actors[0]);

    // Add new indicator
    count_indicator = new MessageCounterIndicator();
    dateMenu._indicator = count_indicator;
    dateMenuLayout.insert_child_at_index(new IndicatorPad(count_indicator.actor), 0);
    dateMenuLayout.add_actor(count_indicator.actor);

}

function disable() {
    let dateMenuLayout = dateMenu.actor.get_children()[0];
    let actors = dateMenuLayout.get_children();

    dateMenuLayout.remove_actor(count_indicator.actor);

    // Remove IndicatorPad padding
    dateMenuLayout.remove_actor(actors[0]);
    actors[0].destroy();

    // Re-add original indicator
    dateMenu._indicator = orig_indicator;
    dateMenuLayout.insert_child_at_index(new IndicatorPad(orig_indicator.actor), 0);
    dateMenuLayout.add_actor(orig_indicator.actor);
}
