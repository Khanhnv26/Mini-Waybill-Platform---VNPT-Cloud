package org.app.supportservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_PRIMARY = "support.direct.change";
    public static final String EXCHANGE_DEAD_LETTER = "support.sla.dlx.exchange";
    public static final String QUEUE_PRIMARY = "support.ticket.priority.queue";
    public static final String QUEUE_SLA = "support.ticket.sla.queue";
    public static final String OUT_DATE_QUEUE = "support.ticket.outdate.queue";

    public static final String ROUTING_KEY_PRIMARY = "ticket.priority";
    public static final String ROUTING_KEY_SLA = "ticket.sla";
    public static final String ROUTING_KEY_OUT_DATE = "ticket.outdate";

    @Bean
    public DirectExchange supportExchange() {
        return new DirectExchange(EXCHANGE_PRIMARY);
    }

    @Bean
    public DirectExchange slaDeadLetterExchange() {
        return new DirectExchange(EXCHANGE_DEAD_LETTER);
    }

    @Bean
    public Queue priorityQueue() {
        return QueueBuilder.durable(QUEUE_PRIMARY).maxPriority(10).build();
    }

    @Bean
    public Queue slaQueue() {
        return QueueBuilder.durable(QUEUE_SLA).ttl(120000)
                .deadLetterExchange(EXCHANGE_DEAD_LETTER)
                .deadLetterRoutingKey(ROUTING_KEY_OUT_DATE)
                .build();
    }

    @Bean
    public Queue outDateQueue() {
        return QueueBuilder.durable(OUT_DATE_QUEUE).build();
    }

    @Bean
    public Binding supportBinding() {
        return BindingBuilder.bind(priorityQueue()).to(supportExchange()).with(ROUTING_KEY_PRIMARY);
    }

    @Bean
    public Binding slaBinding() {
        return BindingBuilder.bind(slaQueue()).to(supportExchange()).with(ROUTING_KEY_SLA);
    }

    @Bean
    public Binding outDateBinding() {
        return BindingBuilder.bind(outDateQueue()).to(slaDeadLetterExchange()).with(ROUTING_KEY_OUT_DATE);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

}
