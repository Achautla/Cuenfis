package mx.cuenfis.app;

import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImpresoraPlugin.class); // antes de super.onCreate para que la web lo encuentre
        super.onCreate(savedInstanceState);
        ajustarAlTeclado();
    }

    /**
     * Android 15 dibuja la app de borde a borde y ya no achica la vista cuando sale el teclado.
     * Capacitor solo deja margen para las barras del sistema; aquí también dejamos el alto del teclado,
     * para que lo que escribes nunca quede tapado.
     */
    private void ajustarAlTeclado() {
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(wv, (v, ins) -> {
            Insets barras = ins.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets teclado = ins.getInsets(WindowInsetsCompat.Type.ime());
            ViewGroup.MarginLayoutParams mlp = (ViewGroup.MarginLayoutParams) v.getLayoutParams();
            mlp.leftMargin = barras.left;
            mlp.topMargin = barras.top;
            mlp.rightMargin = barras.right;
            mlp.bottomMargin = Math.max(barras.bottom, teclado.bottom);
            v.setLayoutParams(mlp);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(wv);
    }
}
