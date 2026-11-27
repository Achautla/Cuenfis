package mx.cuenfis.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Imprime la pantalla actual de la app con el servicio de impresión de Android.
 * Desde ahí el usuario puede elegir "Guardar como PDF". Usa los estilos de impresión de la web.
 */
@CapacitorPlugin(name = "Impresora")
public class ImpresoraPlugin extends Plugin {
    @PluginMethod
    public void imprimir(PluginCall call) {
        final String nombre = call.getString("nombre", "Cuenfis");
        getActivity().runOnUiThread(() -> {
            try {
                WebView web = getBridge().getWebView();
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter adaptador = web.createPrintDocumentAdapter(nombre);
                pm.print(nombre, adaptador, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.NA_LETTER).build());
                call.resolve();
            } catch (Exception e) {
                call.reject("No se pudo imprimir", e);
            }
        });
    }
}
