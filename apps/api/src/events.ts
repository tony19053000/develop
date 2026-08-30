import { randomUUID } from "node:crypto";
import type { AgentEvent, AgentEventLevel, AgentRole } from "@launchforge/shared";

type Listener = (event: AgentEvent) => void;

export class EventBus {
  private readonly events = new Map<string, AgentEvent[]>();
  private readonly listeners = new Map<string, Set<Listener>>();

  list(projectId: string): AgentEvent[] {
    return this.events.get(projectId) ?? [];
  }

  publish(input: {
    projectId: string;
    agent: AgentRole;
    level: AgentEventLevel;
    message: string;
  }): AgentEvent {
    const event: AgentEvent = {
      id: randomUUID(),
      projectId: input.projectId,
      agent: input.agent,
      level: input.level,
      message: input.message,
      createdAt: new Date().toISOString()
    };

    const history = this.events.get(input.projectId) ?? [];
    history.push(event);
    this.events.set(input.projectId, history);

    this.listeners.get(input.projectId)?.forEach((listener) => listener(event));
    return event;
  }

  subscribe(projectId: string, listener: Listener): () => void {
    const listeners = this.listeners.get(projectId) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(projectId, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(projectId);
      }
    };
  }
}

