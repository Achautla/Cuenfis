package mx.cuenfis.app;

import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Dice a la web si el teléfono está en silencio, vibración o No molestar, para que los sonidos
 * de la app lo respeten. El audio de la vista web usa el volumen multimedia, que no se apaga
 * con el modo silencio; por eso se pregunta aquí. No necesita permisos.
 */
@CapacitorPlugin(name = "Sonido")
public class SonidoPlugin extends Plugin {
    @PluginMethod
    public void estado(PluginCall call) {
        JSObject r = new JSObject();
        boolean silencio = false;
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am != null) silencio = am.getRingerMode() != AudioManager.RINGER_MODE_NORMAL;
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                int f = nm.getCurrentInterruptionFilter();
                if (f == NotificationManager.INTERRUPTION_FILTER_NONE || f == NotificationManager.INTERRUPTION_FILTER_ALARMS
                        || f == NotificationManager.INTERRUPTION_FILTER_PRIORITY) silencio = true;
            }
        } catch (Exception e) {
            // Si no se puede saber, no se bloquea el sonido
        }
        r.put("silencio", silencio);
        call.resolve(r);
    }
}
