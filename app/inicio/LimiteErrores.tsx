"use client";

import { Component, type ReactNode } from "react";

// Si algo falla al dibujar los gráficos, solo se ve un aviso en su sitio: el resto de la pantalla (y los botones de periodo) se queda.
export default class LimiteErrores extends Component<{ children: ReactNode; aviso: string }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }

  componentDidUpdate(anterior: { children: ReactNode }) {
    // Si llegan datos nuevos (otro periodo), se vuelve a intentar.
    if (this.state.error && anterior.children !== this.props.children) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--secundario)" }}>
          {this.props.aviso}
          <br />
          <small>({this.state.error.slice(0, 160)})</small>
        </p>
      );
    }
    return this.props.children;
  }
}
